import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Zap, Clock, Activity, Radio, CheckCircle2,
    ArrowRight, Crown, Sparkles, Youtube, Instagram,
    Music2, Power, TrendingUp, SlidersHorizontal, Flame,
    Wifi, Play
} from 'lucide-react';
import './Autopilot.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const NICHES = [
    { id: 'motivational', emoji: '💪', name: 'Motivational', color: '#f97316' },
    { id: 'scary', emoji: '👻', name: 'Scary', color: '#a855f7' },
    { id: 'funfacts', emoji: '🧠', name: 'Fun Facts', color: '#06b6d4' },
    { id: 'lifehacks', emoji: '💡', name: 'Life Hacks', color: '#eab308' },
    { id: 'finance', emoji: '💰', name: 'Finance', color: '#22c55e' },
    { id: 'fitness', emoji: '🏋️', name: 'Fitness', color: '#ef4444' },
    { id: 'cooking', emoji: '🍳', name: 'Cooking', color: '#f59e0b' },
    { id: 'science', emoji: '⚛️', name: 'Science', color: '#818cf8' },
    { id: 'history', emoji: '📜', name: 'History', color: '#a78bfa' },
    { id: 'tech', emoji: '💻', name: 'Tech', color: '#3b82f6' },
];

const TONES = [
    { id: 'energetic', label: '⚡ Energetic' },
    { id: 'dramatic', label: '🎭 Dramatic' },
    { id: 'calm', label: '🧘 Calm' },
    { id: 'mysterious', label: '🌙 Mysterious' },
    { id: 'funny', label: '😄 Funny' },
    { id: 'serious', label: '📰 Serious' },
];

const STYLES = [
    { id: 'vibrant_comic', name: 'Comic', icon: '💥' },
    { id: 'dark_novel', name: 'Creepy', icon: '🦇' },
    { id: 'modern_toon', name: 'Cartoon', icon: '📺' },
    { id: 'pixar_3d', name: 'Disney', icon: '🧸' },
    { id: 'studio_ghibli', name: 'Ghibli', icon: '🍃' },
    { id: 'tokyo_anime', name: 'Anime', icon: '🌸' },
    { id: 'oil_canvas', name: 'Painting', icon: '🎨' },
    { id: 'grim_fantasy', name: 'Fantasy', icon: '🗡️' },
    { id: 'cinematic', name: 'Realism', icon: '🎬' },
    { id: 'cyberpunk', name: 'Neon', icon: '🏙️' },
    { id: 'toy_bricks', name: 'Lego', icon: '🧱' },
    { id: 'vintage_photo', name: 'Polaroid', icon: '📸' },
];

const PLATFORMS = [
    {
        id: 'youtube',
        name: 'YouTube',
        Icon: Youtube,
        color: '#ff4444',
        glow: 'rgba(255,68,68,0.35)',
        bg: 'rgba(255,68,68,0.06)',
        border: 'rgba(255,68,68,0.22)',
        borderActive: 'rgba(255,68,68,0.55)',
        desc: 'Auto-publish as YouTube Shorts',
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        Icon: Music2,
        color: '#00f2ea',
        glow: 'rgba(0,242,234,0.3)',
        bg: 'rgba(0,242,234,0.05)',
        border: 'rgba(0,242,234,0.18)',
        borderActive: 'rgba(0,242,234,0.5)',
        desc: 'Post directly to your TikTok feed',
    },
    {
        id: 'instagram',
        name: 'Instagram',
        Icon: Instagram,
        color: '#e1306c',
        glow: 'rgba(225,48,108,0.3)',
        bg: 'rgba(225,48,108,0.06)',
        border: 'rgba(225,48,108,0.2)',
        borderActive: 'rgba(225,48,108,0.5)',
        desc: 'Share automatically as Reels',
    },
];

function Autopilot({ session }) {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [connectedProfiles, setConnectedProfiles] = useState([]);
    const [connectingPlatform, setConnectingPlatform] = useState(null);

    // Engine config
    const [enabled, setEnabled] = useState(false);
    const [time, setTime] = useState('09:00');
    const [time2, setTime2] = useState('14:00');
    const [time3, setTime3] = useState('20:00');
    const [slot2Enabled, setSlot2Enabled] = useState(true);
    const [slot3Enabled, setSlot3Enabled] = useState(true);
    const [topicPrompt, setTopicPrompt] = useState('Daily motivation for entrepreneurs');
    const [niche, setNiche] = useState('motivational');
    const [tone, setTone] = useState('energetic');
    const [style, setStyle] = useState('cinematic');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            setProfile(profileData);

            if (profileData) {
                setEnabled(profileData.auto_growth_enabled || false);
                setTime(profileData.auto_growth_time || '09:00');
                setTime2(profileData.auto_growth_time_2 || '14:00');
                setTime3(profileData.auto_growth_time_3 || '20:00');
                setSlot2Enabled(!!profileData.auto_growth_time_2);
                setSlot3Enabled(!!profileData.auto_growth_time_3);
                const s = profileData.auto_growth_settings || {};
                setTopicPrompt(s.topic || 'Daily motivation for entrepreneurs');
                setNiche(s.niche || 'motivational');
                setTone(s.tone || 'energetic');
                setStyle(s.style || 'cinematic');
            }

            const res = await fetch(`${API_URL}/api/videos/connected-profiles`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            setConnectedProfiles(data.profiles || []);
        } catch (err) {
            console.error('Autopilot fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/videos/auto-growth-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    enabled,
                    time,
                    time2: profile?.plan === 'dedicated' && slot2Enabled ? time2 : null,
                    time3: profile?.plan === 'dedicated' && slot3Enabled ? time3 : null,
                    settings: { topic: topicPrompt, niche, tone, style }
                })
            });

            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Save failed');
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleConnect = async (platform) => {
        setConnectingPlatform(platform);
        try {
            const res = await fetch(`${API_URL}/api/videos/connect-url?platform=${platform}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                alert(`Error: ${data.error || 'Unknown error. Check Late.dev API key.'}`);
            }
        } catch (err) {
            alert('Failed to connect platform. Please try again.');
        } finally {
            setConnectingPlatform(null);
        }
    };

    const isConnected = (platformId) =>
        connectedProfiles.some(p => p.platform === platformId);

    const isEligible = profile?.plan === 'pro' || profile?.plan === 'dedicated';
    const isLive = isEligible && enabled;

    const selectedNiche = NICHES.find(n => n.id === niche);
    const selectedTone = TONES.find(t => t.id === tone);

    if (loading) {
        return (
            <div className="ap-page ap-loading-state">
                <div className="ap-loading-ring">
                    <div className="ap-loading-inner">
                        <div className="spinner" style={{ width: 48, height: 48 }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ap-page page-enter">
            {/* ── Ambient Background ── */}
            <div className="ap-ambient" aria-hidden="true">
                <div className="ap-orb ap-orb-1" />
                <div className="ap-orb ap-orb-2" />
                <div className="ap-grid-lines" />
            </div>

            <div className="container ap-container">

                {/* ── Hero Header ── */}
                <div className="ap-header animate-slide-up">
                    <div className="ap-header-left">
                        <div className={`ap-status-pill ${isLive ? 'live' : 'idle'}`}>
                            <span className="ap-dot" />
                            <Wifi size={12} />
                            <span>{isLive ? 'Engine Running · Publishing Daily' : 'Engine Idle'}</span>
                        </div>

                        <h1 className="ap-title">
                            Automatic <span className="gradient-text">Growth</span>
                        </h1>
                        <p className="ap-subtitle">
                            Your hands-free content engine. Connect your channels, configure
                            your strategy — ReelsWave posts for you every single day.
                        </p>

                        {!isEligible && (
                            <button
                                className="ap-upgrade-inline-btn"
                                onClick={() => { window.location.href = '/#pricing'; }}
                            >
                                <Crown size={16} />
                                Upgrade to Pro to unlock
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </div>

                    {isEligible && (
                        <div className="ap-power-cluster">
                            <div className={`ap-core ${isLive ? 'active' : ''}`}>
                                <div className="ap-ring ap-ring-outer" />
                                <div className="ap-ring ap-ring-mid" />
                                <button
                                    className={`ap-power-btn ${isLive ? 'on' : 'off'}`}
                                    onClick={() => setEnabled(!enabled)}
                                    title={enabled ? 'Turn off engine' : 'Turn on engine'}
                                >
                                    <Power size={30} strokeWidth={1.5} />
                                </button>
                            </div>
                            <span className={`ap-power-label ${isLive ? 'active' : ''}`}>
                                {enabled ? 'Powered On' : 'Tap to Start'}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Setup Steps ── */}
                <div className="ap-steps animate-slide-up" style={{ animationDelay: '0.08s' }}>
                    {[
                        { n: '1', text: 'Connect at least one social channel below' },
                        { n: '2', text: 'Configure your content engine — niche, style & schedule' },
                        { n: '3', text: 'Hit the power button, then Save Engine Config' },
                    ].map(({ n, text }) => (
                        <div key={n} className="ap-step">
                            <div className="ap-step-num">{n}</div>
                            <span>{text}</span>
                        </div>
                    ))}
                </div>

                {/* ── Platform Channels ── */}
                <div className="ap-section animate-slide-up" style={{ animationDelay: '0.12s' }}>
                    <div className="ap-section-head">
                        <Radio size={13} />
                        <span>Social Channels</span>
                        <div className="ap-section-line" />
                    </div>

                    <div className="ap-platforms-grid">
                        {PLATFORMS.map(({ id, name, Icon, color, glow, bg, border, borderActive, desc }) => {
                            const connected = isConnected(id);
                            const connecting = connectingPlatform === id;
                            return (
                                <div
                                    key={id}
                                    className={`ap-plat-card ${connected ? 'connected' : ''} ${!isEligible ? 'locked' : ''}`}
                                    style={{
                                        '--pc': color,
                                        '--pg': glow,
                                        '--pb': bg,
                                        '--pbd': border,
                                        '--pbda': borderActive,
                                    }}
                                >
                                    <div className="ap-plat-ambient" />
                                    <div className="ap-plat-top">
                                        <div className="ap-plat-icon">
                                            <Icon size={28} strokeWidth={1.5} />
                                            {connected && (
                                                <div className="ap-plat-check">
                                                    <CheckCircle2 size={14} />
                                                </div>
                                            )}
                                        </div>
                                        {connected && (
                                            <div className="ap-plat-live-badge">
                                                <span className="ap-dot small" />
                                                Active
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="ap-plat-name">{name}</h4>
                                    <p className="ap-plat-desc">{desc}</p>

                                    {isEligible ? (
                                        <button
                                            className={`ap-plat-connect-btn ${connected ? 'done' : ''}`}
                                            onClick={() => !connected && handleConnect(id)}
                                            disabled={connecting || connected}
                                        >
                                            {connecting ? (
                                                <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                                            ) : connected ? (
                                                <><CheckCircle2 size={13} /> Connected</>
                                            ) : (
                                                <>Connect <ArrowRight size={13} /></>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="ap-plat-lock">
                                            <Crown size={14} />
                                            <span>Pro only</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Content Engine OR Upgrade Lock ── */}
                {isEligible ? (
                    <div className="ap-section animate-slide-up" style={{ animationDelay: '0.22s' }}>
                        <div className="ap-section-head">
                            <SlidersHorizontal size={13} />
                            <span>Content Engine</span>
                            <div className="ap-section-line" />
                        </div>

                        <div className="ap-engine-layout">
                            {/* LEFT */}
                            <div className="ap-engine-col">

                                {/* AI Prompt */}
                                <div className="ap-field">
                                    <label className="ap-field-label">
                                        <Sparkles size={13} />
                                        AI Prompt
                                    </label>
                                    <textarea
                                        className="ap-textarea"
                                        rows={4}
                                        placeholder="e.g., Daily mind-blowing facts that make people question reality"
                                        value={topicPrompt}
                                        onChange={e => setTopicPrompt(e.target.value)}
                                    />
                                    <span className="ap-hint">
                                        The AI uses this to craft a unique, never-repeated script every single day.
                                    </span>
                                </div>

                                {/* Post Time */}
                                <div className="ap-field">
                                    <label className="ap-field-label">
                                        <Clock size={13} />
                                        {profile?.plan === 'dedicated' ? 'Post Times' : 'Daily Post Time'} <span className="ap-field-muted">(UTC)</span>
                                    </label>
                                    <div className="ap-time-slots">
                                        <div className="ap-time-slot">
                                            {profile?.plan === 'dedicated' && <span className="ap-time-slot-label">Slot 1</span>}
                                            <input
                                                type="time"
                                                className="ap-time-input"
                                                value={time}
                                                onChange={e => setTime(e.target.value)}
                                            />
                                        </div>
                                        {profile?.plan === 'dedicated' && (
                                            <>
                                                <div className={`ap-time-slot ${!slot2Enabled ? 'disabled' : ''}`}>
                                                    <span className="ap-time-slot-label">Slot 2</span>
                                                    <button
                                                        className={`ap-slot-toggle ${slot2Enabled ? 'on' : 'off'}`}
                                                        onClick={() => setSlot2Enabled(!slot2Enabled)}
                                                    />
                                                    <input
                                                        type="time"
                                                        className="ap-time-input"
                                                        value={time2}
                                                        onChange={e => setTime2(e.target.value)}
                                                        disabled={!slot2Enabled}
                                                    />
                                                </div>
                                                <div className={`ap-time-slot ${!slot3Enabled ? 'disabled' : ''}`}>
                                                    <span className="ap-time-slot-label">Slot 3</span>
                                                    <button
                                                        className={`ap-slot-toggle ${slot3Enabled ? 'on' : 'off'}`}
                                                        onClick={() => setSlot3Enabled(!slot3Enabled)}
                                                    />
                                                    <input
                                                        type="time"
                                                        className="ap-time-input"
                                                        value={time3}
                                                        onChange={e => setTime3(e.target.value)}
                                                        disabled={!slot3Enabled}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <span className="ap-hint">
                                        {profile?.plan === 'dedicated'
                                            ? 'Engine fires at all 3 times — 3 videos posted every single day.'
                                            : 'Engine fires at exactly this time — 365 days a year, automatically.'}
                                    </span>
                                </div>

                                {/* Voice Tone */}
                                <div className="ap-field">
                                    <label className="ap-field-label">
                                        <Activity size={13} />
                                        Voice Tone
                                    </label>
                                    <div className="ap-tone-row">
                                        {TONES.map(t => (
                                            <button
                                                key={t.id}
                                                className={`ap-pill ${tone === t.id ? 'selected' : ''}`}
                                                onClick={() => setTone(t.id)}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT */}
                            <div className="ap-engine-col">

                                {/* Niche */}
                                <div className="ap-field">
                                    <label className="ap-field-label">
                                        <TrendingUp size={13} />
                                        Content Niche
                                    </label>
                                    <div className="ap-niche-grid">
                                        {NICHES.map(n => (
                                            <button
                                                key={n.id}
                                                className={`ap-niche-btn ${niche === n.id ? 'selected' : ''}`}
                                                style={{ '--nc': n.color }}
                                                onClick={() => setNiche(n.id)}
                                            >
                                                <span className="ap-niche-emoji">{n.emoji}</span>
                                                <span className="ap-niche-name">{n.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Visual Style */}
                                <div className="ap-field">
                                    <label className="ap-field-label">
                                        <Flame size={13} />
                                        Visual Style
                                    </label>
                                    <div className="ap-style-grid">
                                        {STYLES.map(s => (
                                            <button
                                                key={s.id}
                                                className={`ap-style-btn ${style === s.id ? 'selected' : ''}`}
                                                onClick={() => setStyle(s.id)}
                                            >
                                                <span>{s.icon}</span>
                                                <span>{s.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save reminder when engine is off */}
                        {!enabled && (
                            <div className="ap-save-reminder">
                                <Power size={13} />
                                <span>Toggle the power button on, then save to activate daily publishing.</span>
                            </div>
                        )}

                        {/* Schedule Preview + Save */}
                        <div className="ap-save-bar">
                            <div className="ap-schedule-preview">
                                <div className={`ap-schedule-dot ${isLive ? 'live' : ''}`} />
                                <span>
                                    {isLive
                                        ? profile?.plan === 'dedicated'
                                            ? `Publishing ${selectedNiche?.emoji} ${selectedNiche?.name} at ${[time, slot2Enabled && time2, slot3Enabled && time3].filter(Boolean).join(', ')} UTC · ${selectedTone?.label} tone`
                                            : `Publishing ${selectedNiche?.emoji} ${selectedNiche?.name} videos at ${time} UTC · ${selectedTone?.label} tone`
                                        : 'Engine paused — toggle power on to activate daily publishing'
                                    }
                                </span>
                            </div>
                            <button
                                className={`ap-save-btn ${saved ? 'saved' : ''}`}
                                onClick={handleSave}
                                disabled={saving || saved}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />
                                        Saving...
                                    </>
                                ) : saved ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Saved!
                                    </>
                                ) : (
                                    <>
                                        <Zap size={16} />
                                        Save Engine Config
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Upgrade Wall ── */
                    <div className="ap-upgrade-wall animate-slide-up" style={{ animationDelay: '0.22s' }}>
                        <div className="ap-upgrade-glow" />
                        <div className="ap-upgrade-inner">
                            <div className="ap-upgrade-icon">
                                <Crown size={44} strokeWidth={1} />
                            </div>

                            <div className="ap-upgrade-badge">Pro &amp; Dedicated Exclusive</div>

                            <h2 className="ap-upgrade-title">
                                Unlock the Full <span className="gradient-text">Growth Engine</span>
                            </h2>
                            <p className="ap-upgrade-desc">
                                Automatic Growth lets you build a massive following on autopilot.
                                Your AI content engine runs 24/7 without you lifting a finger.
                            </p>

                            <div className="ap-upgrade-perks">
                                {[
                                    { icon: Play, text: 'AI-generated video posted every single day' },
                                    { icon: Youtube, text: 'Auto-publish to YouTube, TikTok & Instagram simultaneously' },
                                    { icon: TrendingUp, text: 'Custom niche, visual style & voice tone' },
                                    { icon: Zap, text: '365 days of hands-free content, year round' },
                                ].map(({ icon: Icon, text }, i) => (
                                    <div key={i} className="ap-upgrade-perk">
                                        <div className="ap-perk-icon">
                                            <Icon size={16} strokeWidth={1.5} />
                                        </div>
                                        <span>{text}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                className="ap-upgrade-cta"
                                onClick={() => { window.location.href = '/#pricing'; }}
                            >
                                <Crown size={18} />
                                Upgrade to Pro — $29/mo
                                <ArrowRight size={18} />
                            </button>

                            <p className="ap-upgrade-note">
                                Cancel anytime. Dedicated plan posts 3× per day.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Autopilot;
