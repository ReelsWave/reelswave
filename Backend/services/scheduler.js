import cron from 'node-cron';
import { supabase } from '../middleware/auth.js';
import { generateScript, buildCreativeConstraint } from './scriptGenerator.js';
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

    // Build a fully randomised character + scenario seed so GPT starts from a different place every single run
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const charGender      = pick(['man', 'woman', 'teenage boy', 'teenage girl', 'elderly man', 'elderly woman', 'non-binary person']);
    const charAge         = pick(['16', '19', '24', '31', '38', '45', '52', '67', '73']);
    const charBackground  = pick(['Nigerian', 'Japanese', 'Brazilian', 'Pakistani', 'Haitian', 'Russian', 'Mexican', 'Filipino', 'Egyptian', 'Irish', 'Indian', 'Korean', 'Jamaican', 'Turkish', 'Colombian', 'Vietnamese', 'Greek', 'Peruvian', 'Ghanaian', 'Swedish']);
    const charOccupation  = pick(['substitute teacher', 'late-night security guard', 'food-truck owner', 'tattoo artist', 'school janitor', 'freelance photographer', 'rideshare driver', 'barista', 'veterinary tech', 'pawn-shop clerk', 'night-shift nurse', 'street musician', 'personal trainer', 'delivery driver', 'real-estate agent', 'dog groomer', 'librarian', 'social worker', 'mechanic', 'electrician', 'data-entry clerk', 'marine biologist', 'physical therapist', 'firefighter', 'plumber']);
    const charQuirk       = pick(['obsessively colour-codes everything', 'talks out loud to themselves when nervous', 'collects vintage lighters but doesn\'t smoke', 'keeps a notebook of every person who was rude to them', 'can\'t stop doing mental maths', 'rehearses arguments in the shower', 'secretly watches kids\' cartoons to decompress', 'refuses to use elevators', 'can identify any song in 3 notes', 'always arrives 45 minutes early', 'has a strict bedtime routine they can\'t break', 'writes anonymous sticky-note compliments for strangers', 'snorts when they laugh but tries to suppress it', 'still handwrites every reminder', 'memorises licence plates without meaning to']);
    const charTrait       = pick(['deeply introverted', 'disgustingly optimistic', 'chronically late', 'painfully honest', 'secretly generous', 'quietly competitive', 'socially awkward but kind', 'blunt to a fault', 'emotionally guarded', 'absurdly detail-oriented']);
    const settingType     = pick(['workplace', 'public transport', 'hospital waiting room', 'parking lot', 'apartment building hallway', 'gym locker room', 'library', 'laundromat', 'DMV office', 'airport gate', 'community college classroom', 'highway rest stop', 'rooftop', 'empty parking garage', 'bank queue', 'pharmacy', 'car wash', 'pawn shop', 'thrift store', 'courthouse lobby']);
    const conflictType    = pick(['a misunderstanding that spirals out of control', 'a small act of kindness that backfires unexpectedly', 'discovering a secret about someone they trusted', 'being forced into an uncomfortable situation they can\'t escape', 'one tiny mistake that keeps getting worse', 'an unexpected reunion with someone from their past', 'standing up for themselves for the first time', 'having to make an impossible choice on the spot', 'realising they were completely wrong about something', 'a random stranger changing their entire perspective']);

    const scenarioHint = `
CREATE A 100% UNIQUE VIDEO. You MUST use ALL of the following randomly assigned attributes — do NOT change, soften, or ignore any of them:

CHARACTER:
- A ${charAge}-year-old ${charBackground} ${charGender}
- Occupation: ${charOccupation}
- Defining quirk: ${charQuirk}
- Personality trait: ${charTrait}

SETTING: ${settingType}
CONFLICT / STORY ENGINE: ${conflictType}

ADDITIONAL CREATIVE CONSTRAINT (must also incorporate): ${buildCreativeConstraint()}

Build the entire script around this specific character in this specific setting facing this specific conflict. The character must feel like a real, fully-formed person — not a generic placeholder. Every visual scene must reflect their appearance, personality, and the setting above.

IMPORTANT: Do NOT read these instructions aloud. They are for your internal creative use only — the narration should feel natural, not like a character description being recited.`.trim();

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
            orientation: 'portrait',
            style
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
        console.log(`[Auto Growth ${userId}] Using Late.dev profile ID: ${user.late_dev_profile_id}`);
        const connectedProfiles = await getConnectedProfiles(user.late_dev_profile_id);
        console.log(`[Auto Growth ${userId}] Raw accounts:`, JSON.stringify(connectedProfiles.slice(0, 3)));

        if (connectedProfiles.length > 0) {
            // Filter to ONLY accounts belonging to this user's Late.dev profile
            // Late.dev listAccounts may return all accounts — guard against cross-profile posting
            const ownAccounts = connectedProfiles.filter(p => {
                if (!p.profileId) return true; // if field missing, trust the query filter
                return p.profileId === user.late_dev_profile_id;
            });
            console.log(`[Auto Growth ${userId}] Filtered to own accounts:`, ownAccounts.map(p => ({ id: p.id, platform: p.platform, name: p.name })));

            // Deduplicate — keep only the first account per platform (1 TikTok, 1 IG, 1 YT max)
            const seen = new Set();
            const uniqueProfiles = ownAccounts.filter(p => {
                if (seen.has(p.platform)) return false;
                seen.add(p.platform);
                return true;
            });
            const profileIds = uniqueProfiles.map(p => p.id);
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
