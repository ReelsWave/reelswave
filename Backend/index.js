import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import videoRoutes from './routes/videos.js';
import paymentRoutes from './routes/payments.js';
import { initScheduler } from './services/scheduler.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Railway's reverse proxy (required for rate limiting + IP detection)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const generateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 5,
    keyGenerator: (req) => req.user.id,  // per authenticated user, not per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many video generation requests. Please wait before trying again.' }
});

// LemonSqueezy webhook needs raw body (must come before express.json)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Apply global rate limit to all API routes
app.use('/api', apiLimiter);

// Stricter limit on video generation (per authenticated user)
app.post('/api/videos/generate', authMiddleware, generateLimiter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'ReelsWave API' });
});

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/payments', paymentRoutes);

// Serve generated videos temporarily
app.use('/api/output', express.static('output'));

// Start server
app.listen(PORT, () => {
    console.log(`🌊 ReelsWave API running on http://localhost:${PORT}`);
    // Initialize scheduler
    initScheduler();
});
