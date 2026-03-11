import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Get available voices from ElevenLabs
 */
export async function getVoices() {
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

// ElevenLabs voice settings tuned per niche
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

// OpenAI voice mapping per niche
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

/**
 * Generate voiceover using OpenAI TTS + Whisper for timestamps
 */
async function generateVoiceoverOpenAI({ text, outputDir, jobId, niche, tone }) {
    // Strip emotion tags — OpenAI TTS doesn't understand [laughs] etc.
    const cleanText = text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();

    const nicheKey = niche?.toLowerCase().replace(/\s+/g, '');
    const voice = NICHE_OPENAI_VOICES[nicheKey] || NICHE_OPENAI_VOICES[tone?.toLowerCase()] || NICHE_OPENAI_VOICES.default;

    // Generate speech
    const speechResponse = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice,
        input: cleanText,
        response_format: 'mp3'
    });

    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    const audioPath = path.join(outputDir, `${jobId}_voiceover.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    // Get word-level timestamps via Whisper
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

/**
 * Generate voiceover using ElevenLabs TTS (original)
 */
async function generateVoiceoverElevenLabs({ text, voiceId, outputDir, jobId, niche, tone }) {
    const selectedVoiceId = voiceId || 'pNInz6obpgDQGcFmaJgB';

    const nicheKey = niche?.toLowerCase().replace(/\s+/g, '');
    const voiceSettings = NICHE_VOICE_SETTINGS[nicheKey] || NICHE_VOICE_SETTINGS[tone?.toLowerCase()] || NICHE_VOICE_SETTINGS.default;

    const response = await axios.post(
        `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}/with-timestamps`,
        {
            text,
            model_id: 'eleven_v3',
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

/**
 * Main entry point — routes to OpenAI or ElevenLabs based on VOICE_PROVIDER env
 */
export async function generateVoiceover({ text, voiceId, outputDir, jobId, niche = '', tone = '' }) {
    if (process.env.VOICE_PROVIDER === 'openai') {
        return generateVoiceoverOpenAI({ text, outputDir, jobId, niche, tone });
    }
    return generateVoiceoverElevenLabs({ text, voiceId, outputDir, jobId, niche, tone });
}
