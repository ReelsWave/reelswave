import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Get available voices from ElevenLabs
 * @returns {Array} List of available voices
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

/**
 * Generate voiceover audio using ElevenLabs TTS
 * @param {Object} options
 * @param {string} options.text - The full script text to narrate
 * @param {string} options.voiceId - ElevenLabs voice ID
 * @param {string} options.outputDir - Directory to save the audio file
 * @param {string} options.jobId - Unique job identifier for filename
 * @returns {Object} Path to generated audio file and duration info
 */
// Voice settings tuned per niche — controls expressiveness, energy, and emotional range
const NICHE_VOICE_SETTINGS = {
    scary:        { stability: 0.18, similarity_boost: 0.82, style: 0.92, use_speaker_boost: true },  // tense, whispery, unpredictable
    motivational: { stability: 0.28, similarity_boost: 0.78, style: 0.88, use_speaker_boost: true },  // pumped up, soaring
    fitness:      { stability: 0.22, similarity_boost: 0.78, style: 0.90, use_speaker_boost: true },  // aggressive, high-energy
    funfacts:     { stability: 0.42, similarity_boost: 0.76, style: 0.68, use_speaker_boost: true },  // upbeat, conversational
    lifehacks:    { stability: 0.48, similarity_boost: 0.78, style: 0.60, use_speaker_boost: true },  // clear, friendly
    funny:        { stability: 0.20, similarity_boost: 0.75, style: 0.95, use_speaker_boost: true },  // playful, expressive, comedic
    finance:      { stability: 0.58, similarity_boost: 0.82, style: 0.48, use_speaker_boost: true },  // authoritative, measured
    science:      { stability: 0.52, similarity_boost: 0.80, style: 0.52, use_speaker_boost: true },  // curious, clear
    default:      { stability: 0.35, similarity_boost: 0.75, style: 0.75, use_speaker_boost: true },
};

export async function generateVoiceover({ text, voiceId, outputDir, jobId, niche = '', tone = '' }) {
    // Default to a good narrator voice if none specified
    const selectedVoiceId = voiceId || 'pNInz6obpgDQGcFmaJgB'; // "Adam" voice

    // Pick settings by niche, fall back to tone keyword match, then default
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

    // Reconstruct word-level timestamps from character alignment
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

    return {
        audioPath,
        size: audioBuffer.byteLength,
        timestamps
    };
}
