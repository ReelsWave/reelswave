import cron from 'node-cron';
import { supabase } from '../middleware/auth.js';
import { generateScript } from './scriptGenerator.js';
import { generateVoiceover } from './voiceGenerator.js';
import { fetchStockFootage } from './stockFetcher.js';
import { assembleVideo } from './videoAssembler.js';
import { uploadVideo, getConnectedProfiles } from './lateService.js';
import { acquire, release } from './semaphore.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const OUTPUT_DIR = path.resolve('output');

/**
 * Initialize the background scheduler
 */
export function initScheduler() {
    console.log('⏰ Scheduler initialized');

    // Check every minute
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const currentUtcTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

        try {
            // Find users where any of their scheduled time slots match now
            const { data: users, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('auto_growth_enabled', true)
                .in('plan', ['pro', 'dedicated'])
                .or(`auto_growth_time.eq.${currentUtcTime},auto_growth_time_2.eq.${currentUtcTime},auto_growth_time_3.eq.${currentUtcTime}`);

            if (error) {
                console.error('Scheduler DB error:', error.message);
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const user of users) {
                // Slot 1 — all eligible plans
                if (user.auto_growth_time === currentUtcTime) {
                    const lastRun = user.last_auto_growth_run ? new Date(user.last_auto_growth_run) : null;
                    if (!lastRun || lastRun < today) {
                        console.log(`🚀 Auto Growth slot 1 for user: ${user.id}`);
                        runAutoGrowthForUser(user, 1).catch(err =>
                            console.error(`Auto Growth slot 1 failed for ${user.id}:`, err.message)
                        );
                    }
                }

                // Slots 2 & 3 — Dedicated only
                if (user.plan === 'dedicated') {
                    if (user.auto_growth_time_2 === currentUtcTime) {
                        const lastRun2 = user.last_auto_growth_run_2 ? new Date(user.last_auto_growth_run_2) : null;
                        if (!lastRun2 || lastRun2 < today) {
                            console.log(`🚀 Auto Growth slot 2 for user: ${user.id}`);
                            runAutoGrowthForUser(user, 2).catch(err =>
                                console.error(`Auto Growth slot 2 failed for ${user.id}:`, err.message)
                            );
                        }
                    }

                    if (user.auto_growth_time_3 === currentUtcTime) {
                        const lastRun3 = user.last_auto_growth_run_3 ? new Date(user.last_auto_growth_run_3) : null;
                        if (!lastRun3 || lastRun3 < today) {
                            console.log(`🚀 Auto Growth slot 3 for user: ${user.id}`);
                            runAutoGrowthForUser(user, 3).catch(err =>
                                console.error(`Auto Growth slot 3 failed for ${user.id}:`, err.message)
                            );
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Scheduler error:', err.message);
        }
    });
}

/**
 * Core logic for a single auto-growth run
 * @param {Object} user - User profile data
 */
async function runAutoGrowthForUser(user, slot = 1) {
    // Guard: skip if user has no credits
    if (!user.credits || user.credits <= 0) {
        console.warn(`[Auto Growth ${user.id}] Skipping slot ${slot} — no credits remaining`);
        return;
    }

    const jobId = uuidv4();
    const userId = user.id;
    const settings = (slot === 2 ? user.auto_growth_settings_2 : slot === 3 ? user.auto_growth_settings_3 : null) || user.auto_growth_settings || {};

    let {
        topic = 'Interesting facts',
        niche = 'funfacts',
        tone = 'energetic',
        duration = 60,
        voiceId = 'pNInz6obpgDQGcFmaJgB', // Adam's actual ID
        style = 'cinematic realism'
    } = settings;

    // Provide fallback if voiceId was saved as a name in the DB instead of ID
    if (voiceId === 'Adam') {
        voiceId = 'pNInz6obpgDQGcFmaJgB';
    }

    // Tell GPT to invent its own unique scenario + character each run for endless variety
    const characters = [
        'a tired dad', 'a college student', 'a new employee on their first day', 'an overconfident gym bro',
        'a clueless tourist', 'a stressed mom', 'a retired grandpa', 'a broke 20-something',
        'an overly competitive coworker', 'a nervous first-time driver', 'a hypochondriac',
        'a guy who thinks he\'s a genius', 'a chronically late person', 'an online shopping addict',
        'a person who never asks for help', 'an overthinker', 'a procrastinator at their limit',
        'a people-pleaser', 'someone having the worst day of their life', 'a total cheapskate'
    ];
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    const scenarioHint = `The main character must be: ${randomCharacter}. Invent a completely unique, specific everyday scenario for them that hasn't been done before. Be creative and unexpected — avoid food, kitchens, and grocery scenarios.`;

    // Define job-specific output directory
    const jobDir = path.join(OUTPUT_DIR, jobId);
    if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
    }

    await acquire();

    try {
        // Step 1: Generate Script
        console.log(`[Auto Growth ${userId}] Generating script...`);
        const script = await generateScript({ topic, niche, tone, duration, style, scenarioHint });

        // Step 2: Generate Voiceover
        console.log(`[Auto Growth ${userId}] Generating voiceover...`);
        const { audioPath, timestamps } = await generateVoiceover({
            text: script.cleanScript,
            voiceId,
            outputDir: OUTPUT_DIR,
            jobId,
            niche,
            tone
        });

        // Step 3: Fetch stock footage
        console.log(`[Auto Growth ${userId}] Fetching footage...`);
        const searchTerms = script.segments.map(s => s.imagePrompt || s.searchTerm);
        const clips = await fetchStockFootage({
            searchTerms,
            outputDir: OUTPUT_DIR,
            jobId,
            orientation: 'portrait'
        });

        // Step 4: Assemble video
        console.log(`[Auto Growth ${userId}] Assembling...`);
        const videoPath = await assembleVideo({
            clips,
            audioPath,
            outputDir: OUTPUT_DIR,
            jobId,
            script,
            timestamps,
            watermark: false // Pro/Dedicated users get no watermark
        });

        // Step 5: Upload to Supabase Storage
        console.log(`[Auto Growth ${userId}] Uploading to Supabase...`);
        const videoBuffer = fs.readFileSync(videoPath);
        const storagePath = `videos/${userId}/auto_${jobId}.mp4`;

        const { error: uploadError } = await supabase.storage
            .from('reelswave-videos')
            .upload(storagePath, videoBuffer, {
                contentType: 'video/mp4'
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('reelswave-videos')
            .getPublicUrl(storagePath);

        // Step 6: Save to database
        await supabase
            .from('videos')
            .insert({
                id: jobId,
                user_id: userId,
                title: script.title || topic,
                topic,
                niche,
                tone,
                script: JSON.stringify(script),
                video_url: publicUrl,
                storage_path: storagePath,
                status: 'completed',
                hashtags: script.hashtags || []
            });

        // Step 7: Upload to Socials via Late.dev
        console.log(`[Auto Growth ${userId}] Posting to Socials...`);
        // Get connected profiles for this user using their specific Late.dev profile ID
        const connectedProfiles = await getConnectedProfiles(user.late_dev_profile_id);

        if (connectedProfiles.length > 0) {
            const profileIds = connectedProfiles.map(p => p.id);
            await uploadVideo({
                profileIds,
                videoUrl: publicUrl,
                text: `${script.title}\n\n${script.hashtags.map(t => `#${t}`).join(' ')}`
            });
            console.log(`[Auto Growth ${userId}] Successfully posted to ${connectedProfiles.length} socials.`);
        } else {
            console.warn(`[Auto Growth ${userId}] No social profiles connected. Skipping post.`);
        }

        // Step 8: Update profile (credits and last run for this slot)
        const runUpdate = { credits: Math.max(0, user.credits - 1) };
        if (slot === 1) runUpdate.last_auto_growth_run = new Date().toISOString();
        if (slot === 2) runUpdate.last_auto_growth_run_2 = new Date().toISOString();
        if (slot === 3) runUpdate.last_auto_growth_run_3 = new Date().toISOString();

        await supabase
            .from('profiles')
            .update(runUpdate)
            .eq('id', userId);

        // Cleanup local file
        try { fs.unlinkSync(videoPath); } catch (e) { }

        console.log(`[Auto Growth ${userId}] COMPLETED!`);

    } catch (err) {
        console.error(`[Auto Growth ${userId}] ERROR:`, err.message);
    } finally {
        release();
    }
}
