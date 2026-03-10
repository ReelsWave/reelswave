import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { VoicePicker } from '../components/VoicePicker';
import {
    Zap, Clock, Activity, Radio, CheckCircle2,
    ArrowRight, Crown, Sparkles, Youtube, Instagram,
    Music2, Power, TrendingUp, SlidersHorizontal, Flame,
    Wifi, Play, Mic, Timer, Unplug, X
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

const DURATIONS = [
    { value: 45, label: '30–60s', sub: 'Short form' },
    { value: 75, label: '60–90s', sub: 'Long form', monetized: true },
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
    const [disconnectingPlatform, setDisconnectingPlatform] = useState(null);
    const [disconnectConfirm, setDisconnectConfirm] = useState(null); // { id, name, Icon, color }

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
    const [voiceId, setVoiceId] = useState('pNInz6obpgDQGcFmaJgB');
    const [duration, setDuration] = useState(75);

    const DEFAULT_SLOT_CONFIG = { topic: 'Daily motivation for entrepreneurs', niche: 'motivational', tone: 'energetic', style: 'cinematic', voiceId: 'pNInz6obpgDQGcFmaJgB', duration: 75 };
    const [slot2Config, setSlot2Config] = useState(DEFAULT_SLOT_CONFIG);
    const [slot3Config, setSlot3Config] = useState(DEFAULT_SLOT_CONFIG);
    const [activeSlot, setActiveSlot] = useState(1);
    const [voices, setVoices] = useState([]);

    useEffect(() => {
        fetchData();
        fetch(`${API_URL}/api/videos/voices`)
            .then(r => r.json())
            .then(d => setVoices(d.voices || []))
            .catch(() => {});
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
                setVoiceId(s.voiceId || 'pNInz6obpgDQGcFmaJgB');
                setDuration(s.duration || 75);
                if (profileData.auto_growth_settings_2) setSlot2Config(profileData.auto_growth_settings_2);
                if (profileData.auto_growth_settings_3) setSlot3Config(profileData.auto_growth_settings_3);
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
                    settings: { topic: topicPrompt, niche, tone, style, voiceId, duration },
                    settings2: profile?.plan === 'dedicated' ? slot2Config : null,
                    settings3: profile?.plan === 'dedicated' ? slot3Config : null,
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

    const handleDisconnect = (platformId) => {
        const platform = PLATFORMS.find(p => p.id === platformId);
        setDisconnectConfirm(platform);
    };

    const confirmDisconnect = async () => {
        const platformId = disconnectConfirm.id;
        const account = connectedProfiles.find(p => p.platform === platformId);
        if (!account) return;
        const accountId = account._id || account.accountId || account.id;
        if (!accountId) { alert('Could not resolve account ID. Please try again.'); return; }
        setDisconnectingPlatform(platformId);
        setDisconnectConfirm(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/api/videos/disconnect-account`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ accountId })
            });
            if (!res.ok) throw new Error('Failed to disconnect');
            setConnectedProfiles(prev => prev.filter(p => p.platform !== platformId));
        } catch (err) {
            alert('Failed to disconnect. Please try again.');
        } finally {
            setDisconnectingPlatform(null);
        }
    };

    const isConnected = (platformId) =>
        connectedProfiles.some(p => p.platform === platformId);

    const isEligible = profile?.plan === 'pro' || profile?.plan === 'dedicated';
    const isDedicated = profile?.plan === 'dedicated';
    const isLive = isEligible && enabled;

    // Active slot config helpers for Dedicated tab UI
    const activeValues = activeSlot === 1
        ? { topic: topicPrompt, niche, tone, style, voiceId, duration }
        : activeSlot === 2 ? slot2Config : slot3Config;

    const setActiveValue = (key, value) => {
        if (activeSlot === 1) {
            if (key === 'topic') setTopicPrompt(value);
            else if (key === 'niche') setNiche(value);
            else if (key === 'tone') setTone(value);
            else if (key === 'style') setStyle(value);
            else if (key === 'voiceId') setVoiceId(value);
            else if (key === 'duration') setDuration(value);
        } else if (activeSlot === 2) {
            setSlot2Config(prev => ({ ...prev, [key]: value }));
        } else {
            setSlot3Config(prev => ({ ...prev, [key]: value }));
        }
    };

    const selectedNiche = NICHES.find(n => n.id === (isDedicated ? activeValues.niche : niche));
    const selectedTone = TONES.find(t => t.id === (isDedicated ? activeValues.tone : tone));

    const activeSlotTime = activeSlot === 1 ? time : activeSlot === 2 ? time2 : time3;
    const setActiveSlotTime = (v) => { if (activeSlot === 1) setTime(v); else if (activeSlot === 2) setTime2(v); else setTime3(v); };
    const activeSlotEnabled = activeSlot === 1 ? true : activeSlot === 2 ? slot2Enabled : slot3Enabled;
    const toggleActiveSlot = () => { if (activeSlot === 2) setSlot2Enabled(p => !p); else if (activeSlot === 3) setSlot3Enabled(p => !p); };

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
        <>
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
                                        <div className="ap-plat-btn-row">
                                            <button
                                                className={`ap-plat-connect-btn ${connected ? 'done' : ''}`}
                                                onClick={() => !connected && handleConnect(id)}
                                                disabled={connecting || connected || disconnectingPlatform === id}
                                            >
                                                {connecting ? (
                                                    <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                                                ) : connected ? (
                                                    <><CheckCircle2 size={13} /> Connected</>
                                                ) : (
                                                    <>Connect <ArrowRight size={13} /></>
                                                )}
                                            </button>
                                            {connected && (
                                                <button
                                                    className="ap-plat-disconnect-btn"
                                                    onClick={() => handleDisconnect(id)}
                                                    disabled={disconnectingPlatform === id}
                                                >
                                                    {disconnectingPlatform === id ? (
                                                        <span className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
                                                    ) : 'Disconnect'}
                                                </button>
                                            )}
                                        </div>
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

                        {/* Dedicated: Slot Tab Switcher */}
                        {isDedicated && (
                            <div className="ap-slot-tabs">
                                {[1, 2, 3].map(slot => {
                                    const slotTime = slot === 1 ? time : slot === 2 ? time2 : time3;
                                    const slotOn = slot === 1 ? true : slot === 2 ? slot2Enabled : slot3Enabled;
                                    return (
                                        <button
                                            key={slot}
                                            className={`ap-slot-tab ${activeSlot === slot ? 'active' : ''} ${!slotOn && slot !== 1 ? 'ap-slot-tab-off' : ''}`}
                                            onClick={() => setActiveSlot(slot)}
                                        >
                                            <span>Slot {slot}</span>
                                            <span className="ap-slot-tab-time">{slotOn ? slotTime : 'Off'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="ap-engine-layout">
                            {/* LEFT */}
                            <div className="ap-engine-col">

                                {/* Post Time — Pro: static field. Dedicated: per active slot inside tab */}
                                <div className="ap-field">
                                    <label className="ap-field-label">
                                        <Clock size={13} />
                                        {isDedicated ? `Slot ${activeSlot} Post Time` : 'Daily Post Time'} <span className="ap-field-muted">(UTC)</span>
                                    </label>
                                    <div className="ap-time-slots">
                                        <div className={`ap-time-slot ${isDedicated && activeSlot !== 1 && !activeSlotEnabled ? 'disabled' : ''}`}>
                                            {isDedicated && activeSlot !== 1 && (
                                                <button
                                                    className={`ap-slot-toggle ${activeSlotEnabled ? 'on' : 'off'}`}
                                                    onClick={toggleActiveSlot}
                                                />
                                            )}
                                            <input
                                                type="time"
                                                className="ap-time-input"
                                                value={isDedicated ? activeSlotTime : time}
                                                onChange={e => isDedicated ? setActiveSlotTime(e.target.value) : setTime(e.target.value)}
                                                disabled={isDedicated && activeSlot !== 1 && !activeSlotEnabled}
                                            />
                                        </div>
                                    </div>
                                    <span className="ap-hint">
                                        {isDedicated
                                            ? `Configure time & content separately for each slot. Active: ${[true, slot2Enabled, slot3Enabled].filter(Boolean).length} of 3 slots.`
                                            : 'Engine fires at exactly this time — 365 days a year, automatically.'}
                                    </span>
                                </div>

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
                                        value={isDedicated ? activeValues.topic : topicPrompt}
                                        onChange={e => isDedicated ? setActiveValue('topic', e.target.value) : setTopicPrompt(e.target.value)}
                                    />
                                    <span className="ap-hint">
                                        The AI uses this to craft a unique, never-repeated script every single day.
                                    </span>
                                </div>

                                {/* Voice */}
                                <div className="ap-field">
                                    <label className="ap-field-label">
                                        <Mic size={13} />
                                        Voice
                                    </label>
                                    <VoicePicker
                                        voices={voices}
                                        value={isDedicated ? activeValues.voiceId : voiceId}
                                        onChange={v => isDedicated ? setActiveValue('voiceId', v) : setVoiceId(v)}
                                    />
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
                                                className={`ap-pill ${(isDedicated ? activeValues.tone : tone) === t.id ? 'selected' : ''}`}
                                                onClick={() => isDedicated ? setActiveValue('tone', t.id) : setTone(t.id)}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Video Length */}
                                <div className="ap-field">
                                    <label className="ap-field-label">
                                        <Timer size={13} />
                                        Video Length
                                    </label>
                                    <div className="ap-duration-row">
                                        {DURATIONS.map(d => (
                                            <button
                                                key={d.value}
                                                className={`ap-duration-btn ${(isDedicated ? activeValues.duration : duration) === d.value ? 'selected' : ''}`}
                                                onClick={() => isDedicated ? setActiveValue('duration', d.value) : setDuration(d.value)}
                                            >
                                                <span className="ap-dur-label">{d.label}</span>
                                                <span className="ap-dur-sub">
                                                    {d.sub}
                                                    {d.monetized && <span className="ap-dur-money">💰 Monetizable</span>}
                                                </span>
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
                                                className={`ap-niche-btn ${(isDedicated ? activeValues.niche : niche) === n.id ? 'selected' : ''}`}
                                                style={{ '--nc': n.color }}
                                                onClick={() => isDedicated ? setActiveValue('niche', n.id) : setNiche(n.id)}
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
                                                className={`ap-style-btn ${(isDedicated ? activeValues.style : style) === s.id ? 'selected' : ''}`}
                                                onClick={() => isDedicated ? setActiveValue('style', s.id) : setStyle(s.id)}
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
                                            ? isDedicated
                                            ? `Publishing at ${[time, slot2Enabled && time2, slot3Enabled && time3].filter(Boolean).join(', ')} UTC · ${[time, slot2Enabled, slot3Enabled].filter(Boolean).length} slot${[time, slot2Enabled && time2, slot3Enabled && time3].filter(Boolean).length > 1 ? 's' : ''} active`
                                            : `Publishing ${selectedNiche?.emoji} ${selectedNiche?.name} videos at ${time} UTC · ${selectedTone?.label} tone`
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

        {/* ── Disconnect Confirm Modal ── */}
        {disconnectConfirm && (
            <div className="dc-backdrop" onClick={() => setDisconnectConfirm(null)}>
                <div className="dc-modal" onClick={e => e.stopPropagation()}>
                    <button className="dc-close" onClick={() => setDisconnectConfirm(null)}>
                        <X size={16} />
                    </button>
                    <div className="dc-icon-wrap" style={{ '--dc': disconnectConfirm.color }}>
                        <disconnectConfirm.Icon size={26} strokeWidth={1.5} />
                    </div>
                    <h3 className="dc-title">Disconnect {disconnectConfirm.name}?</h3>
                    <p className="dc-body">
                        Auto-growth will stop posting to your {disconnectConfirm.name} channel. You can reconnect at any time.
                    </p>
                    <div className="dc-actions">
                        <button className="dc-cancel" onClick={() => setDisconnectConfirm(null)}>Cancel</button>
                        <button className="dc-confirm" onClick={confirmDisconnect}>
                            <Unplug size={14} />
                            Disconnect
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

export default Autopilot;
