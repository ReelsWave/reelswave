import cron from 'node-cron';
import { supabase } from '../middleware/auth.js';
import { generateScript } from './scriptGenerator.js';
import { generateVoiceover } from './voiceGenerator.js';
import { fetchStockFootage } from './stockFetcher.js';
import { assembleVideo } from './videoAssembler.js';
import { uploadVideo, getConnectedProfiles } from './lateService.js';
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
            // Find users due for auto growth
            // 1. Enabled
            // 2. Time matches (HH:mm)
            // 3. Plan is pro or dedicated
            // 4. Not run today (last_auto_growth_run is null or < today)
            const { data: users, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('auto_growth_enabled', true)
                .eq('auto_growth_time', currentUtcTime)
                .in('plan', ['pro', 'dedicated']);

            if (error) {
                console.error('Scheduler DB error:', error.message);
                return;
            }

            for (const user of users) {
                // Check if already run today
                const lastRun = user.last_auto_growth_run ? new Date(user.last_auto_growth_run) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (lastRun && lastRun >= today) {
                    continue; // Skip if already run today
                }

                console.log(`🚀 Triggering Auto Growth for user: ${user.id}`);
                runAutoGrowthForUser(user).catch(err => {
                    console.error(`Auto Growth failed for user ${user.id}:`, err.message);
                });
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
async function runAutoGrowthForUser(user) {
    const jobId = uuidv4();
    const userId = user.id;
    const settings = user.auto_growth_settings || {};

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

    // Define job-specific output directory
    const jobDir = path.join(OUTPUT_DIR, jobId);
    if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
    }

    try {
        // Step 1: Generate Script
        console.log(`[Auto Growth ${userId}] Generating script...`);
        const script = await generateScript({ topic, niche, tone, duration, style });

        // Step 2: Generate Voiceover
        console.log(`[Auto Growth ${userId}] Generating voiceover...`);
        const { audioPath, timestamps } = await generateVoiceover({
            text: script.cleanScript,
            voiceId,
            outputDir: OUTPUT_DIR,
            jobId
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

        // Step 8: Update profile (credits and last run)
        await supabase
            .from('profiles')
            .update({
                credits: Math.max(0, user.credits - 1),
                last_auto_growth_run: new Date().toISOString()
            })
            .eq('id', userId);

        // Cleanup local file
        try { fs.unlinkSync(videoPath); } catch (e) { }

        console.log(`[Auto Growth ${userId}] COMPLETED!`);

    } catch (err) {
        console.error(`[Auto Growth ${userId}] ERROR:`, err.message);
    }
}
