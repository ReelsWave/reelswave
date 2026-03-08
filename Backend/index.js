import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import videoRoutes from './routes/videos.js';
import paymentRoutes from './routes/payments.js';
import { initScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// LemonSqueezy webhook needs raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

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
