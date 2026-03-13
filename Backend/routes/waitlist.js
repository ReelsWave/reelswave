import express from 'express';
import { Resend } from 'resend';
import { supabase } from '../middleware/auth.js';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const COUNT_OFFSET = 1200; // Start counter from this number

/**
 * POST /api/waitlist
 * Add email to waitlist and send confirmation email
 */
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        // Insert into Supabase (ignore duplicate emails)
        const { error } = await supabase
            .from('waitlist')
            .insert({ email: email.toLowerCase().trim() });

        if (error) {
            if (error.code === '23505') {
                // Already on waitlist — still return success
                return res.json({ success: true, alreadyExists: true });
            }
            throw error;
        }

        // Get current count for position
        const { count } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true });

        const position = (count || 0) + COUNT_OFFSET;

        // Send confirmation email
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'ReelsWave <noreply@reelswave.com>',
                to: email,
                subject: "You're on the ReelsWave waitlist 🎬",
                html: `
                    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
                        <h1 style="font-size: 28px; margin-bottom: 8px;">You're in. 🔥</h1>
                        <p style="color: #aaa; font-size: 16px; margin-bottom: 24px;">
                            You're <strong style="color: #fff;">#${position}</strong> on the ReelsWave waitlist.
                        </p>
                        <p style="color: #ccc; font-size: 15px; line-height: 1.6;">
                            ReelsWave lets you create faceless AI videos and automatically post them to TikTok, Instagram, and YouTube —
                            with zero editing, zero cameras, and zero effort.
                        </p>
                        <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin-top: 16px;">
                            We'll email you the moment we go live. You'll be one of the first in.
                        </p>
                        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; color: #555; font-size: 13px;">
                            ReelsWave — AI-powered faceless video automation
                        </div>
                    </div>
                `
            });
        }

        res.json({ success: true, position });
    } catch (err) {
        console.error('[waitlist] error:', err.message);
        res.status(500).json({ error: 'Failed to join waitlist' });
    }
});

/**
 * GET /api/waitlist/count
 * Get total waitlist count (with offset)
 */
router.get('/count', async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        res.json({ count: (count || 0) + COUNT_OFFSET });
    } catch (err) {
        console.error('[waitlist/count] error:', err.message);
        res.json({ count: COUNT_OFFSET });
    }
});

export default router;
