import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './WaitlistModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://reelswave-production.up.railway.app';

export default function WaitlistModal({ isOpen, onClose }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle | loading | success | error | duplicate
    const [position, setPosition] = useState(null);
    const [count, setCount] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetch(`${API_URL}/api/waitlist/count`)
                .then(r => r.json())
                .then(d => setCount(d.count))
                .catch(() => {});
        }
    }, [isOpen]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!email || status === 'loading') return;
        setStatus('loading');
        try {
            const res = await fetch(`${API_URL}/api/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            if (data.alreadyExists) {
                setStatus('duplicate');
            } else {
                setPosition(data.position);
                setStatus('success');
            }
        } catch {
            setStatus('error');
        }
    }

    if (!isOpen) return null;

    return (
        <div className="wl-overlay" onClick={onClose}>
            <div className="wl-modal" onClick={e => e.stopPropagation()}>
                <button className="wl-close" onClick={onClose}><X size={18} /></button>

                {status === 'success' ? (
                    <div className="wl-success">
                        <div className="wl-success-icon">🎬</div>
                        <h2>You're in!</h2>
                        <p className="wl-position">You're <strong>#{position}</strong> on the waitlist</p>
                        <p className="wl-sub">We'll email you the moment we go live. You'll be one of the first in.</p>
                    </div>
                ) : status === 'duplicate' ? (
                    <div className="wl-success">
                        <div className="wl-success-icon">✅</div>
                        <h2>Already on the list!</h2>
                        <p className="wl-sub">We already have your email. We'll notify you when we go live.</p>
                    </div>
                ) : (
                    <>
                        <div className="wl-header">
                            <h2>Join the Waitlist</h2>
                            <p className="wl-sub">ReelsWave is coming soon. Be the first to get access.</p>
                            {count && (
                                <div className="wl-counter">
                                    <span className="wl-counter-num">{count.toLocaleString()}</span>
                                    <span className="wl-counter-label">people waiting</span>
                                </div>
                            )}
                        </div>
                        <form className="wl-form" onSubmit={handleSubmit}>
                            <input
                                type="email"
                                className="wl-input"
                                placeholder="your@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="wl-btn"
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                            </button>
                            {status === 'error' && (
                                <p className="wl-error">Something went wrong. Please try again.</p>
                            )}
                        </form>
                        <p className="wl-note">No spam. Just a launch notification.</p>
                    </>
                )}
            </div>
        </div>
    );
}
