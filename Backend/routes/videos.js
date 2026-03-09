import express from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, supabase } from '../middleware/auth.js';
import { generateScript } from '../services/scriptGenerator.js';
import { generateVoiceover, getVoices } from '../services/voiceGenerator.js';
import { fetchStockFootage } from '../services/stockFetcher.js';
import { assembleVideo } from '../services/videoAssembler.js';
import { getConnectUrl, getConnectedProfiles, createLateProfile } from '../services/lateService.js';

const router = express.Router();
const OUTPUT_DIR = path.resolve('output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// In-memory job tracking & queue
const jobs = new Map();
const jobQueue = [];
let isProcessing = false;

const processNextJob = async () => {
    if (jobQueue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const currentJob = jobQueue.shift();
    const { jobId, userId, topic, niche, tone, duration, voiceId, style, providedScript, profile } = currentJob;

    // Update queue position for remaining jobs
    jobQueue.forEach((job, index) => {
        const jobData = jobs.get(job.jobId);
        if (jobData) {
            jobs.set(job.jobId, { ...jobData, position: index + 1 });
        }
    });

    // Define job-specific output directory
    const jobDir = path.join(OUTPUT_DIR, jobId);
    if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
    }

    try {
        // Step 1: Generate or use provided script
        jobs.set(jobId, { ...jobs.get(jobId), status: 'generating_script', progress: 15, position: 0 });
        const script = providedScript || await generateScript({ topic, niche, tone, duration, style });

        // Step 2: Generate Voiceover (using clean text without emojis/markdown)
        jobs.set(jobId, { ...jobs.get(jobId), status: 'generating_voiceover', progress: 30 });
        console.log(`[Job ${jobId}] Generating voiceover using clean script...`);
        const { audioPath, timestamps } = await generateVoiceover({
            text: script.cleanScript,
            voiceId,
            outputDir: OUTPUT_DIR,
            jobId
        });
        console.log(`[Job ${jobId}] Voiceover complete: ${audioPath}`);

        // Step 3: Fetch stock footage
        jobs.set(jobId, { ...jobs.get(jobId), status: 'fetching_footage', progress: 50 });
        const searchTerms = script.segments.map(s => s.imagePrompt || s.searchTerm);
        const clips = await fetchStockFootage({
            searchTerms,
            outputDir: OUTPUT_DIR,
            jobId,
            orientation: 'portrait'
        });

        // Step 4: Assemble video
        jobs.set(jobId, { ...jobs.get(jobId), status: 'assembling_video', progress: 70 });
        const isFreeTrial = profile.plan === 'free';
        const videoPath = await assembleVideo({
            clips,
            audioPath,
            outputDir: OUTPUT_DIR,
            jobId,
            script,
            timestamps,
            watermark: isFreeTrial
        });

        // Step 5: Upload to Supabase Storage
        jobs.set(jobId, { ...jobs.get(jobId), status: 'uploading', progress: 90 });
        const videoBuffer = fs.readFileSync(videoPath);
        const storagePath = `videos/${userId}/${jobId}.mp4`;

        const { error: uploadError } = await supabase.storage
            .from('reelswave-videos')
            .upload(storagePath, videoBuffer, {
                contentType: 'video/mp4',
                cacheControl: '3600'
            });

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('reelswave-videos')
            .getPublicUrl(storagePath);

        // Step 6: Save to database
        const { error: dbError } = await supabase
            .from('videos')
            .insert({
                id: jobId,
                user_id: userId,
                title: script.title || topic,
                topic,
                niche,
                tone: tone || 'energetic',
                script: JSON.stringify(script),
                video_url: publicUrl,
                storage_path: storagePath,
                status: 'completed',
                hashtags: script.hashtags || []
            });

        if (dbError) {
            console.error('DB insert error:', dbError);
        }

        // Deduct credit
        await supabase
            .from('profiles')
            .update({ credits: profile.credits - 1 })
            .eq('id', userId);

        // Cleanup local file
        try { fs.unlinkSync(videoPath); } catch (e) { }

        jobs.set(jobId, { ...jobs.get(jobId), status: 'completed', progress: 100, videoUrl: publicUrl });

    } catch (err) {
        console.error('Video generation error:', err);
        jobs.set(jobId, { ...jobs.get(jobId), status: 'failed', progress: 0, error: err.message });
    } finally {
        processNextJob();
    }
};

/**
 * GET /api/videos/voices
 * Get available ElevenLabs voices
 */
router.get('/voices', async (req, res) => {
    try {
        const voices = await getVoices();
        res.json({ voices });
    } catch (err) {
        console.error('Failed to fetch voices:', err.message);
        res.status(500).json({ error: 'Failed to fetch voices' });
    }
});

/**
 * POST /api/videos/generate
 * Full video generation pipeline
 */
router.post('/generate', authMiddleware, async (req, res) => {
    const jobId = uuidv4();
    const userId = req.user.id;

    try {
        const { topic, niche, tone, duration, voiceId, style, script: providedScript } = req.body;

        if (!topic || !niche) {
            return res.status(400).json({ error: 'Topic and niche are required' });
        }

        // Check user credits
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('credits, plan')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(403).json({ error: 'User profile not found' });
        }

        if (profile.credits <= 0) {
            return res.status(403).json({ error: 'No credits remaining. Please upgrade your plan.' });
        }

        // Initialize job tracking
        const position = jobQueue.length + 1;
        jobs.set(jobId, {
            status: position === 1 && !isProcessing ? 'generating_script' : 'queued',
            progress: position === 1 && !isProcessing ? 10 : 0,
            position: position === 1 && !isProcessing ? 0 : position,
            userId,
            createdAt: new Date().toISOString()
        });

        // Queue the job
        jobQueue.push({
            jobId,
            userId,
            topic,
            niche,
            tone,
            duration,
            voiceId,
            style,
            providedScript,
            profile
        });

        // Start processing if not already running
        if (!isProcessing) {
            processNextJob();
        }

        // Return job ID immediately
        res.json({ jobId, status: 'queued', position });

    } catch (err) {
        console.error('Generate error:', err.message);
        res.status(500).json({ error: 'Failed to queue video generation' });
    }
});

/**
 * GET /api/videos/status/:jobId
 * Poll job status
 */
router.get('/status/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});

/**
 * GET /api/videos
 * List user's videos
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data: videos, error } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ videos });
    } catch (err) {
        console.error('List videos error:', err.message);
        res.status(500).json({ error: 'Failed to list videos' });
    }
});

/**
 * DELETE /api/videos/:id
 * Delete a video
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { data: video, error: fetchError } = await supabase
            .from('videos')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError || !video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Delete from storage
        if (video.storage_path) {
            await supabase.storage.from('reelswave-videos').remove([video.storage_path]);
        }

        // Delete from database
        await supabase.from('videos').delete().eq('id', req.params.id);

        res.json({ message: 'Video deleted' });
    } catch (err) {
        console.error('Delete video error:', err.message);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

/**
 * GET /api/videos/connect-url
 * Get Late.dev connection magic link
 */
router.get('/connect-url', authMiddleware, async (req, res) => {
    try {
        const { platform } = req.query;
        if (!platform) {
            return res.status(400).json({ error: 'platform is required' });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('late_dev_profile_id')
            .eq('id', req.user.id)
            .single();

        let lateProfileId = profile?.late_dev_profile_id;

        if (!lateProfileId) {
            lateProfileId = await createLateProfile(req.user.id);
            await supabase
                .from('profiles')
                .update({ late_dev_profile_id: lateProfileId })
                .eq('id', req.user.id);
        }

        const url = await getConnectUrl(lateProfileId, platform);
        res.json({ url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/videos/connected-profiles
 * Get connected social profiles from Late.dev
 */
router.get('/connected-profiles', authMiddleware, async (req, res) => {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('late_dev_profile_id')
            .eq('id', req.user.id)
            .single();

        if (!profile?.late_dev_profile_id) {
            return res.json({ profiles: [] });
        }

        const profiles = await getConnectedProfiles(profile.late_dev_profile_id);
        res.json({ profiles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/videos/auto-growth-settings
 * Update Auto Growth settings
 */
router.post('/auto-growth-settings', authMiddleware, async (req, res) => {
    try {
        const { enabled, time, time2, time3, settings } = req.body;
        const userId = req.user.id;

        // Verify plan
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', userId)
            .single();

        if (profile.plan !== 'pro' && profile.plan !== 'dedicated') {
            return res.status(403).json({ error: 'Auto Growth is only available for Pro and Dedicated plans.' });
        }

        const updatePayload = {
            auto_growth_enabled: enabled,
            auto_growth_time: time,
            auto_growth_settings: settings
        };

        if (profile.plan === 'dedicated') {
            updatePayload.auto_growth_time_2 = time2 || null;
            updatePayload.auto_growth_time_3 = time3 || null;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId);

        if (error) throw error;
        res.json({ message: 'Settings updated' });
    } catch (err) {
        console.error('Update settings error:', err.message);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
