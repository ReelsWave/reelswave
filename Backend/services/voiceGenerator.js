import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

// ffmpeg binary path (same detection as videoAssembler)
const _ffmpegCandidates = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
const FFMPEG_BIN = _ffmpegCandidates.find(p => fs.existsSync(p)) || 'ffmpeg';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const INWORLD_TTS_URL   = 'https://api.inworld.ai/tts/v1/voice';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── ElevenLabs ──────────────────────────────────────────────────────────────

const NICHE_VOICE_SETTINGS = {
    scary:        { stability: 0.18, similarity_boost: 0.82, style: 0.92, use_speaker_boost: true },
    motivational: { stability: 0.28, similarity_boost: 0.78, style: 0.88, use_speaker_boost: true },
    fitness:      { stability: 0.22, similarity_boost: 0.78, style: 0.90, use_speaker_boost: true },
    funfacts:     { stability: 0.42, similarity_boost: 0.76, style: 0.68, use_speaker_boost: true },
    lifehacks:    { stability: 0.48, similarity_boost: 0.78, style: 0.60, use_speaker_boost: true },
    funny:        { stability: 0.20, similarity_boost: 0.75, style: 0.95, use_speaker_boost: true },
    finance:      { stability: 0.58, similarity_boost: 0.82, style: 0.48, use_speaker_boost: true },
    science:      { stability: 0.52, similarity_boost: 0.80, style: 0.52, use_speaker_boost: true },
    default:      { stability: 0.35, similarity_boost: 0.75, style: 0.75, use_speaker_boost: true },
};

// ─── Inworld voices ──────────────────────────────────────────────────────────

const INWORLD_DEFAULT_VOICE = 'Ashley';

// Fallback catalog used if the API fetch fails
const INWORLD_VOICES_FALLBACK = [
    { id: 'Abby',     name: 'Abby',     labels: { gender: 'Female', age: 'Young' } },
    { id: 'Alex',     name: 'Alex',     labels: { gender: 'Male',   age: 'Middle Aged' } },
    { id: 'Amina',    name: 'Amina',    labels: { gender: 'Female', age: 'Middle Aged' } },
    { id: 'Anjali',   name: 'Anjali',   labels: { gender: 'Female', age: 'Middle Aged' } },
    { id: 'Arjun',    name: 'Arjun',    labels: { gender: 'Male',   age: 'Middle Aged' } },
    { id: 'Ashley',   name: 'Ashley',   labels: { gender: 'Female', age: 'Middle Aged' } },
    { id: 'Avery',    name: 'Avery',    labels: { gender: 'Male',   age: 'Young' } },
    { id: 'Bianca',   name: 'Bianca',   labels: { gender: 'Female', age: 'Middle Aged' } },
    { id: 'Blake',    name: 'Blake',    labels: { gender: 'Male',   age: 'Middle Aged' } },
    { id: 'Clive',    name: 'Clive',    labels: { gender: 'Male',   age: 'Middle Aged' } },
    { id: 'Hades',    name: 'Hades',    labels: { gender: 'Male',   age: 'Middle Aged' } },
    { id: 'Hana',     name: 'Hana',     labels: { gender: 'Female', age: 'Young' } },
    { id: 'Luna',     name: 'Luna',     labels: { gender: 'Female', age: 'Middle Aged' } },
    { id: 'Mark',     name: 'Mark',     labels: { gender: 'Male',   age: 'Middle Aged' } },
    { id: 'Olivia',   name: 'Olivia',   labels: { gender: 'Female', age: 'Middle Aged' } },
    { id: 'Theodore', name: 'Theodore', labels: { gender: 'Male',   age: 'Old' } },
    // Custom cloned voices
    { id: 'default-4bxboc9fz9kno2krbnku4g__speed', name: 'Speed (Clone)', labels: { gender: 'Male', age: 'Young' } },
];

function inworldAuthHeader() {
    // Inworld gives you the API key already base64-encoded — use it directly
    return `Basic ${process.env.INWORLD_API_KEY || ''}`;
}

/**
 * Call Inworld TTS directly and return an MP3 Buffer.
 * Response: { audioContent: "<base64 MP3>" }
 */
async function callInworldTTS(text, voice) {
    const response = await axios.post(
        INWORLD_TTS_URL,
        {
            text,
            voiceId:  voice,
            modelId:  'inworld-tts-1.5-max',
            audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 48000 },
            applyTextNormalization: 'on'   // auto-expand $1,500 → "fifteen hundred dollars", dates, etc.
        },
        { headers: { Authorization: inworldAuthHeader(), 'Content-Type': 'application/json' } }
    );
    const b64 = response.data?.audioContent;
    if (!b64) throw new Error(`Inworld TTS: no audioContent in response — ${JSON.stringify(response.data)}`);
    return Buffer.from(b64, 'base64');
}

// ─── OpenAI voice mapping ─────────────────────────────────────────────────────

const NICHE_OPENAI_VOICES = {
    scary:        'fable',
    motivational: 'onyx',
    fitness:      'echo',
    funny:        'nova',
    funfacts:     'nova',
    lifehacks:    'alloy',
    finance:      'onyx',
    science:      'alloy',
    default:      'onyx',
};

// ─── getVoices ────────────────────────────────────────────────────────────────

/**
 * Get available voices — routes to the active provider.
 * Returns a normalised array of { id, name, previewUrl?, labels? }
 */
export async function getVoices() {
    const provider = (process.env.VOICE_PROVIDER || 'elevenlabs').toLowerCase();

    if (provider === 'inworld') {
        try {
            // Fetch live voice list from Inworld — includes custom/cloned voices automatically
            const res = await axios.get('https://api.inworld.ai/tts/v1/voices', {
                headers: { Authorization: inworldAuthHeader() }
            });
            const voices = res.data?.voices || [];
            return voices.map(v => ({
                id: v.voiceId,
                name: v.isCustom ? `${v.displayName} ✦` : v.displayName,
                category: v.isCustom ? 'cloned' : 'inworld',
                previewUrl: null,
                labels: { custom: v.isCustom }
            }));
        } catch (err) {
            console.warn('[voiceGenerator] Failed to fetch Inworld voices from API, using fallback list:', err.message);
            // Fall through to hardcoded list
        }
        return INWORLD_VOICES_FALLBACK.map(v => ({
            ...v,
            category: v.id.includes('__') ? 'cloned' : 'inworld',
            previewUrl: null,
        }));
    }

    if (provider === 'openai') {
        return [
            { id: 'alloy',   name: 'Alloy',   category: 'openai' },
            { id: 'echo',    name: 'Echo',     category: 'openai' },
            { id: 'fable',   name: 'Fable',    category: 'openai' },
            { id: 'nova',    name: 'Nova',     category: 'openai' },
            { id: 'onyx',    name: 'Onyx',     category: 'openai' },
            { id: 'shimmer', name: 'Shimmer',  category: 'openai' },
        ];
    }

    // Default: ElevenLabs
    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    });
    return response.data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        previewUrl: voice.preview_url,
        labels: voice.labels
    }));
}

// ─── Inworld TTS (via AIML API) ───────────────────────────────────────────────

async function generateVoiceoverInworld({ text, voiceId, outputDir, jobId }) {
    // text already has Inworld markup preserved ([sigh], [laugh], *emphasis*)
    // — do NOT strip tags here, they're intentional delivery cues
    const selectedVoice = voiceId || INWORLD_DEFAULT_VOICE;

    // 1. Generate speech via Inworld direct API
    const audioBuffer = await callInworldTTS(text, selectedVoice);
    const audioPath = path.join(outputDir, `${jobId}_voiceover.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    // 2. Get word-level timestamps via Whisper (AIML API doesn't return them)
    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word']
    });

    const timestamps = (transcription.words || []).map(w => ({
        word: w.word,
        start: w.start,
        end: w.end
    }));

    return { audioPath, size: audioBuffer.byteLength, timestamps };
}

// ─── ElevenLabs TTS ───────────────────────────────────────────────────────────

async function generateVoiceoverElevenLabs({ text, voiceId, outputDir, jobId, niche, tone }) {
    const selectedVoiceId = voiceId || 'pNInz6obpgDQGcFmaJgB';

    const nicheKey = niche?.toLowerCase().replace(/\s+/g, '');
    const voiceSettings = NICHE_VOICE_SETTINGS[nicheKey] || NICHE_VOICE_SETTINGS[tone?.toLowerCase()] || NICHE_VOICE_SETTINGS.default;

    const cleanText = text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();

    const response = await axios.post(
        `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}/with-timestamps`,
        {
            text: cleanText,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: voiceSettings
        },
        {
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            }
        }
    );

    const base64Audio = response.data.audio_base64;
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    const audioPath = path.join(outputDir, `${jobId}_voiceover.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    const align = response.data.alignment;
    let timestamps = [];
    let currentWord = '';
    let start = null;
    let end = null;

    if (align && align.characters) {
        for (let i = 0; i < align.characters.length; i++) {
            const char = align.characters[i];
            if (char.trim() !== '') {
                if (currentWord === '') start = align.character_start_times_seconds[i];
                currentWord += char;
                end = align.character_end_times_seconds[i];
            } else if (currentWord !== '') {
                timestamps.push({ word: currentWord, start, end });
                currentWord = '';
            }
        }
        if (currentWord !== '') {
            timestamps.push({ word: currentWord, start, end });
        }
    }

    return { audioPath, size: audioBuffer.byteLength, timestamps };
}

// ─── OpenAI TTS ───────────────────────────────────────────────────────────────

async function generateVoiceoverOpenAI({ text, outputDir, jobId, niche, tone }) {
    const cleanText = text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();

    const nicheKey = niche?.toLowerCase().replace(/\s+/g, '');
    const voice = NICHE_OPENAI_VOICES[nicheKey] || NICHE_OPENAI_VOICES[tone?.toLowerCase()] || NICHE_OPENAI_VOICES.default;

    const speechResponse = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice,
        input: cleanText,
        response_format: 'mp3'
    });

    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    const audioPath = path.join(outputDir, `${jobId}_voiceover.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word']
    });

    const timestamps = (transcription.words || []).map(w => ({
        word: w.word,
        start: w.start,
        end: w.end
    }));

    return { audioPath, size: audioBuffer.byteLength, timestamps };
}

// ─── Inworld preview ──────────────────────────────────────────────────────────

/**
 * Generate a short audio preview for an Inworld voice.
 * Returns a Buffer of MP3 audio.
 */
export async function generateInworldPreview(voiceId) {
    const sampleText = `Hey! I'm ${voiceId}. I'm ready to bring your content to life.`;
    return callInworldTTS(sampleText, voiceId);
}

// ─── Dialogue voiceover ───────────────────────────────────────────────────────
// Generates audio for each segment separately with the correct voice (A or B),
// concatenates them into one audio file, then runs Whisper for timestamps.

function cleanSegmentForInworld(text = '') {
    return text
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/_/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1') // strip **bold**, keep text
        .replace(/[-—]/g, ',')
        .replace(/[\n\r]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export async function generateDialogueVoiceover({ script, voiceIdA, voiceIdB, outputDir, jobId }) {
    const voiceA = voiceIdA || INWORLD_DEFAULT_VOICE;
    const voiceB = voiceIdB || voiceA; // fall back to same voice if B not provided

    // Build ordered list of all spoken pieces with their speaker
    const pieces = [
        { text: script.hook, speaker: 'A' },
        ...script.segments.map(s => ({ text: s.text, speaker: s.speaker || 'A' })),
        { text: script.callToAction, speaker: 'A' },
    ];

    const segmentPaths = [];
    for (let i = 0; i < pieces.length; i++) {
        const { text, speaker } = pieces[i];
        const voice = speaker === 'B' ? voiceB : voiceA;
        const cleanText = cleanSegmentForInworld(text);
        if (!cleanText) continue;

        const segPath = path.join(outputDir, `${jobId}_dlg_${i}.mp3`);
        const audioBuffer = await callInworldTTS(cleanText, voice);
        fs.writeFileSync(segPath, audioBuffer);
        segmentPaths.push(segPath);
    }

    // Write ffmpeg concat list
    const listFile = path.join(outputDir, `${jobId}_dlg_list.txt`);
    fs.writeFileSync(listFile, segmentPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));

    // Concatenate all segment audio into one file
    const combinedPath = path.join(outputDir, `${jobId}_voiceover.mp3`);
    await new Promise((resolve, reject) => {
        const proc = spawn(FFMPEG_BIN, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', combinedPath]);
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg concat failed (${code}): ${stderr.slice(-300)}`)));
    });

    // Get word-level timestamps via Whisper on the combined audio
    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(combinedPath),
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word']
    });

    const timestamps = (transcription.words || []).map(w => ({
        word: w.word,
        start: w.start,
        end: w.end
    }));

    return { audioPath: combinedPath, size: fs.statSync(combinedPath).size, timestamps };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateVoiceover({ text, voiceId, outputDir, jobId, niche = '', tone = '' }) {
    const provider = (process.env.VOICE_PROVIDER || 'elevenlabs').toLowerCase();

    if (provider === 'inworld') {
        return generateVoiceoverInworld({ text, voiceId, outputDir, jobId, niche, tone });
    }
    if (provider === 'openai') {
        return generateVoiceoverOpenAI({ text, outputDir, jobId, niche, tone });
    }
    return generateVoiceoverElevenLabs({ text, voiceId, outputDir, jobId, niche, tone });
}
