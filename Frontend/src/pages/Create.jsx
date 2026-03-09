import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Create.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const NICHES = [
    { id: 'motivational', icon: '💪', name: 'Motivational', desc: 'Inspiring stories & quotes' },
    { id: 'scary', icon: '😱', name: 'Scary Stories', desc: 'Creepy tales & horror' },
    { id: 'funfacts', icon: '🧠', name: 'Fun Facts', desc: 'Mind-blowing facts' },
    { id: 'lifehacks', icon: '💡', name: 'Life Hacks', desc: 'Useful tips & tricks' },
    { id: 'finance', icon: '💰', name: 'Finance', desc: 'Money tips & investing' },
    { id: 'fitness', icon: '🏋️', name: 'Fitness', desc: 'Workout & health tips' },
    { id: 'cooking', icon: '🍳', name: 'Cooking', desc: 'Recipes & food tips' },
    { id: 'science', icon: '🔬', name: 'Science', desc: 'Amazing discoveries' },
    { id: 'history', icon: '📜', name: 'History', desc: 'Historical events & stories' },
    { id: 'tech', icon: '💻', name: 'Technology', desc: 'Tech news & gadgets' },
];

const TONES = [
    { id: 'energetic', name: 'Energetic', icon: '⚡' },
    { id: 'dramatic', name: 'Dramatic', icon: '🎭' },
    { id: 'calm', name: 'Calm', icon: '🧘' },
    { id: 'mysterious', name: 'Mysterious', icon: '🌙' },
    { id: 'funny', name: 'Funny', icon: '😄' },
    { id: 'serious', name: 'Serious', icon: '📰' },
];

const STYLES = [
    { id: 'vibrant_comic', name: 'Comic', icon: '💥', prompt: 'vibrant comic book style, pop art, cel shaded, bold outlines, highly detailed', bg: 'url(/styles/vibrant_comic.jpg)' },
    { id: 'dark_novel', name: 'Creepy Comic', icon: '🦇', prompt: 'dark comic book style, creepy, terrifying, deep shadows, gritty, high contrast, horror', bg: 'url(/styles/dark_novel.jpg)' },
    { id: 'modern_toon', name: 'Modern Cartoon', icon: '📺', prompt: 'modern 2D cartoon style, clean lines, flat colors, vector art, smooth, high quality', bg: 'url(/styles/modern_toon.jpg)' },
    { id: 'pixar_3d', name: 'Disney', icon: '🧸', prompt: '3D rendered, Pixar style, cute, smooth lighting, Unreal Engine 5, octane render', bg: 'url(/styles/pixar_3d.jpg)' },
    { id: 'studio_ghibli', name: 'Ghibli', icon: '🍃', prompt: 'Studio Ghibli style, lush anime background, watercolor, vibrant, masterpiece, beautiful', bg: 'url(/styles/studio_ghibli.jpg)' },
    { id: 'tokyo_anime', name: 'Anime', icon: '🌸', prompt: 'anime style, 90s cel animation, retro aesthetic, high quality, masterpiece', bg: 'url(/styles/tokyo_anime.jpg)' },
    { id: 'oil_canvas', name: 'Painting', icon: '🎨', prompt: 'classic oil painting, visible brush strokes, canvas texture, classical art style, museum quality', bg: 'url(/styles/oil_canvas.jpg)' },
    { id: 'grim_fantasy', name: 'Dark Fantasy', icon: '🗡️', prompt: 'dark fantasy, grimdark, gothic, moody, epic fantasy concept art, trending on artstation', bg: 'url(/styles/grim_fantasy.jpg)' },
    { id: 'toy_bricks', name: 'Lego', icon: '🧱', prompt: 'made entirely of plastic toy bricks, lego style, macro photography, highly detailed, miniature', bg: 'url(/styles/toy_bricks.jpg)' },
    { id: 'vintage_photo', name: 'Polaroid', icon: '📸', prompt: 'polaroid photograph, vintage, 35mm film, grainy, light leaks, nostalgic photography', bg: 'url(/styles/vintage_photo.svg)' },
    { id: 'cinematic', name: 'Realism', icon: '🎬', prompt: 'cinematic photography, ultra realistic, 8k, sharp focus, dramatic lighting, photorealistic', bg: 'url(/styles/cinematic.jpg)' },
    { id: 'ethereal_dream', name: 'Fantastic', icon: '✨', prompt: 'ethereal fantasy, glowing lights, magical, surreal, dreamy vibe, beautiful, glowing', bg: 'url(/styles/ethereal_dream.jpg)' }
];

function Create({ session }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [voices, setVoices] = useState([]);

    // Form state
    const [niche, setNiche] = useState('');
    const [videoStyle, setVideoStyle] = useState('');
    const [topic, setTopic] = useState('');
    const [tone, setTone] = useState('energetic');
    const [duration, setDuration] = useState(60);
    const [voiceId, setVoiceId] = useState('');
    // Generation state
    const [generating, setGenerating] = useState(false);
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [error, setError] = useState('');

    // Fetch voices on mount
    useEffect(() => {
        fetch(`${API_URL}/api/videos/voices`)
            .then(res => res.json())
            .then(data => setVoices(data.voices || []))
            .catch(() => { });
    }, []);

    // Poll job status
    useEffect(() => {
        if (!jobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/api/videos/status/${jobId}`);
                const data = await res.json();
                setJobStatus(data);

                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(interval);
                    if (data.status === 'completed') {
                        setTimeout(() => navigate('/dashboard'), 2000);
                    }
                }
            } catch (err) {
                console.error('Status poll error:', err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [jobId, navigate]);

    const handleGenerate = async () => {
        setGenerating(true);
        setError('');

        try {
            const selectedStyleDetails = STYLES.find(s => s.id === videoStyle)?.prompt || '';

            const res = await fetch(`${API_URL}/api/videos/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    topic,
                    niche,
                    tone,
                    duration,
                    voiceId,
                    style: selectedStyleDetails
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to start generation');

            setJobId(data.jobId);
            setStep(4);
        } catch (err) {
            setError(err.message);
            setGenerating(false);
        }
    };

    const statusMessages = {
        queued: `⏳ You are #${jobStatus?.position || 1} in the queue...`,
        generating_script: '✍️ Writing viral script...',
        generating_voiceover: '🎙️ Generating voiceover...',
        fetching_footage: '🎬 Rendering AI visuals...',
        assembling_video: '🔧 Assembling your video...',
        uploading: '☁️ Uploading to cloud...',
        completed: '✅ Your video is ready!',
        failed: '❌ Generation failed'
    };

    return (
        <div className="create-page page-enter">
            <div className="container">
                {/* Progress Steps */}
                <div className="create-progress">
                    {['Niche', 'Style', 'Customize', 'Generate'].map((label, i) => (
                        <div key={label} className={`progress-step ${step > i ? 'completed' : ''} ${step === i + 1 ? 'active' : ''}`}>
                            <div className="step-dot">{step > i + 1 ? '✓' : i + 1}</div>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="auth-error" style={{ maxWidth: 600, margin: '0 auto 24px' }}>
                        {error}
                    </div>
                )}

                {/* Step 1: Pick Niche */}
                {step === 1 && (
                    <div className="create-step animate-fade-in">
                        <div className="text-center" style={{ marginBottom: 40 }}>
                            <h2>Choose Your <span className="gradient-text">Niche</span></h2>
                            <p>What type of content do you want to create?</p>
                        </div>
                        <div className="niches-select-grid">
                            {NICHES.map(n => (
                                <button
                                    key={n.id}
                                    className={`niche-select-card card ${niche === n.id ? 'niche-selected' : ''}`}
                                    onClick={() => { setNiche(n.id); setStep(2); }}
                                >
                                    <span className="niche-select-icon">{n.icon}</span>
                                    <span className="niche-select-name">{n.name}</span>
                                    <span className="niche-select-desc">{n.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Pick Style */}
                {step === 2 && (
                    <div className="create-step animate-fade-in">
                        <div className="text-center" style={{ marginBottom: 40 }}>
                            <h2>Choose Visual <span className="gradient-text">Style</span></h2>
                            <p>Select the aesthetic for your AI-generated footage</p>
                        </div>

                        <div className="styles-grid-container">
                            {STYLES.map(s => (
                                <div
                                    key={s.id}
                                    className="style-card-wrapper"
                                    onClick={() => setVideoStyle(s.id)}
                                >
                                    <div
                                        className={`style-card ${videoStyle === s.id ? 'style-selected' : ''}`}
                                        style={{ background: s.bg }}
                                    >
                                        {videoStyle === s.id && (
                                            <div className="style-check">✓</div>
                                        )}
                                    </div>
                                    <div className="style-label">
                                        <span className="style-icon">{s.icon}</span>
                                        <span className="style-name">{s.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="create-actions" style={{ maxWidth: 800, margin: '40px auto 0' }}>
                            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setStep(3)}
                                disabled={!videoStyle}
                            >
                                Continue to Customize →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Customize */}
                {step === 3 && (
                    <div className="create-step animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
                        <div className="text-center" style={{ marginBottom: 40 }}>
                            <h2>Customize Your Video</h2>
                            <p>Tell us what you want your video to be about</p>
                        </div>

                        <div className="create-form">
                            <div className="form-group">
                                <label>Topic — What's the video about?</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Why 90% of startups fail in the first year"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Tone</label>
                                <div className="tone-grid">
                                    {TONES.map(t => (
                                        <button
                                            key={t.id}
                                            className={`tone-btn ${tone === t.id ? 'tone-active' : ''}`}
                                            onClick={() => setTone(t.id)}
                                        >
                                            {t.icon} {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Duration</label>
                                <div className="duration-btns">
                                    {[30, 60, 90].map(d => (
                                        <button
                                            key={d}
                                            className={`btn ${duration === d ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                            onClick={() => setDuration(d)}
                                        >
                                            {d}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {voices.length > 0 && (
                                <div className="form-group">
                                    <label>Voice</label>
                                    <select
                                        className="select"
                                        value={voiceId}
                                        onChange={e => setVoiceId(e.target.value)}
                                    >
                                        <option value="">Default (Adam)</option>
                                        {voices.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="create-actions">
                                <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                                <button
                                    className="btn btn-primary"
                                    disabled={!topic || generating}
                                    onClick={handleGenerate}
                                >
                                    {generating ? (
                                        <>
                                            <span className="spinner"></span>
                                            Starting...
                                        </>
                                    ) : (
                                        'Generate Video →'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Generation Progress */}
                {step === 4 && (
                    <div className="create-step animate-fade-in text-center" style={{ maxWidth: 500, margin: '0 auto' }}>
                        <div style={{ fontSize: '4rem', marginBottom: 24, animation: 'float 2s ease infinite' }}>
                            {jobStatus?.status === 'completed' ? '🎉' : '🌊'}
                        </div>
                        <h2>
                            {jobStatus?.status === 'completed' ? 'Video Ready!' : 'Creating Your Video'}
                        </h2>
                        <p style={{ margin: '16px 0 32px' }}>
                            {statusMessages[jobStatus?.status] || 'Starting generation...'}
                        </p>

                        <div className="progress-bar" style={{ marginBottom: 16 }}>
                            <div className="progress-fill" style={{ width: `${jobStatus?.progress || 5}%` }}></div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {jobStatus?.progress || 5}% complete
                        </p>

                        {jobStatus?.status === 'completed' && (
                            <p style={{ marginTop: 20, color: 'var(--success)' }}>
                                Redirecting to your dashboard...
                            </p>
                        )}

                        {jobStatus?.status === 'failed' && (
                            <div style={{ marginTop: 20 }}>
                                <p style={{ color: 'var(--danger)', marginBottom: 16 }}>
                                    {jobStatus.error || 'Something went wrong'}
                                </p>
                                <button className="btn btn-primary" onClick={() => { setStep(3); setJobId(null); setJobStatus(null); setGenerating(false); }}>
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Create;
