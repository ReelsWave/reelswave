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
export async function generateVoiceover({ text, voiceId, outputDir, jobId }) {
    // Default to a good narrator voice if none specified
    const selectedVoiceId = voiceId || 'pNInz6obpgDQGcFmaJgB'; // "Adam" voice

    const response = await axios.post(
        `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}/with-timestamps`,
        {
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                // Lower stability encourages emotional range rather than flat consistency
                stability: 0.35,
                // Keep similarity boost high to retain the actor's intended sound
                similarity_boost: 0.75,
                // High style pushes the AI to exaggerate punctuation and sound highly enthusiastic/conversational
                style: 0.75,
                use_speaker_boost: true
            }
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
