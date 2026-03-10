import { useState, useRef, useEffect } from 'react';
import './VoicePicker.css';

const AVATAR_COLORS = ['#00b2cb', '#a855f7', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6'];
const getAvatarColor = (name) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getVoiceDesc = (v) => {
    const parts = [];
    if (v.labels?.age) parts.push(v.labels.age);
    if (v.labels?.gender) parts.push(v.labels.gender);
    if (v.labels?.accent) parts.push(v.labels.accent);
    if (v.labels?.description) parts.push(v.labels.description);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' · ') || v.category || '';
};

export function VoicePicker({ voices, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState(null);
    const audioRef = useRef(null);
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Stop audio when closing
    useEffect(() => {
        if (!open) {
            audioRef.current?.pause();
            audioRef.current = null;
            setPlayingVoiceId(null);
        }
    }, [open]);

    const playPreview = (voice, e) => {
        e.stopPropagation();
        if (!voice.previewUrl) return;
        if (playingVoiceId === voice.id) {
            audioRef.current?.pause();
            audioRef.current = null;
            setPlayingVoiceId(null);
            return;
        }
        audioRef.current?.pause();
        const audio = new Audio(voice.previewUrl);
        audio.onended = () => setPlayingVoiceId(null);
        audio.play();
        audioRef.current = audio;
        setPlayingVoiceId(voice.id);
    };

    const selectedVoice = voices.find(v => v.id === value) || voices[0];

    return (
        <div className="vp-container" ref={containerRef}>
            <button
                type="button"
                className={`vp-trigger ${open ? 'open' : ''}`}
                onClick={() => setOpen(o => !o)}
            >
                {selectedVoice ? (
                    <>
                        <div className="vp-trigger-avatar" style={{ background: getAvatarColor(selectedVoice.name) }}>
                            {selectedVoice.name[0].toUpperCase()}
                        </div>
                        <div className="vp-trigger-info">
                            <span className="vp-trigger-name">{selectedVoice.name}</span>
                            <span className="vp-trigger-desc">{getVoiceDesc(selectedVoice)}</span>
                        </div>
                    </>
                ) : (
                    <span className="vp-trigger-placeholder">
                        {voices.length === 0 ? 'Loading voices...' : 'Select a voice'}
                    </span>
                )}
                <svg className={`vp-chevron ${open ? 'flipped' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="vp-dropdown">
                    {voices.map(v => (
                        <div
                            key={v.id}
                            className={`vp-option ${value === v.id ? 'selected' : ''}`}
                            onClick={() => { onChange(v.id); setOpen(false); }}
                        >
                            <div className="vp-avatar" style={{ background: getAvatarColor(v.name) }}>
                                {v.name[0].toUpperCase()}
                            </div>
                            <div className="vp-info">
                                <div className="vp-name">{v.name}</div>
                                <div className="vp-desc">{getVoiceDesc(v)}</div>
                            </div>
                            {v.previewUrl && (
                                <button
                                    type="button"
                                    className={`vp-play-btn ${playingVoiceId === v.id ? 'playing' : ''}`}
                                    onClick={(e) => playPreview(v, e)}
                                    title={playingVoiceId === v.id ? 'Stop' : 'Preview'}
                                >
                                    {playingVoiceId === v.id ? '■' : '▶'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
