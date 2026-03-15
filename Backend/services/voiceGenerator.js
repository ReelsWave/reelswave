import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const INWORLD_API_URL = 'https://api.inworld.ai/tts/v1';
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

// Full catalog — sourced from the Inworld TTS voice list
const INWORLD_VOICES = [
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
];

function inworldAuthHeader() {
    // Inworld expects Basic auth with the API key
    const encoded = Buffer.from(process.env.INWORLD_API_KEY || '').toString('base64');
    return `Basic ${encoded}`;
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
        // Return hardcoded catalog — previewUrl is populated by the frontend
        // using the /api/videos/voice-preview/:voiceId endpoint
        return INWORLD_VOICES.map(v => ({
            ...v,
            category: 'inworld',
            previewUrl: null, // frontend injects the endpoint URL
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

// ─── Inworld TTS ──────────────────────────────────────────────────────────────

async function generateVoiceoverInworld({ text, voiceId, outputDir, jobId }) {
    const cleanText = text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    const selectedVoice = voiceId || INWORLD_DEFAULT_VOICE;
    const temperature = 1.1;

    const response = await axios.post(
        `${INWORLD_API_URL}/voice`,
        {
            text: cleanText,
            voiceId: selectedVoice,
            modelId: 'inworld-tts-1.5-max',
            audioConfig: {
                audioEncoding: 'MP3',
                sampleRateHertz: 48000,
                speakingRate: 1.0
            },
            temperature,
            timestampType: 'WORD'
        },
        {
            headers: {
                Authorization: inworldAuthHeader(),
                'Content-Type': 'application/json'
            }
        }
    );

    // audioContent is base64-encoded MP3
    const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
    const audioPath = path.join(outputDir, `${jobId}_voiceover.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    // Parse word-level timestamps from Inworld response
    const wordAlignment = response.data?.timestampInfo?.wordAlignment || [];
    const timestamps = wordAlignment.map(w => ({
        word: w.words,
        start: w.wordStartTimeSeconds,
        end: w.wordEndTimeSeconds
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
    const sampleText = `Hey! I'm ${voiceId}, ready to bring your content to life.`;
    const response = await axios.post(
        `${INWORLD_API_URL}/voice`,
        {
            text: sampleText,
            voiceId,
            modelId: 'inworld-tts-1.5-max',
            audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 48000 },
            temperature: 1.1
        },
        { headers: { Authorization: inworldAuthHeader(), 'Content-Type': 'application/json' } }
    );
    return Buffer.from(response.data.audioContent, 'base64');
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
