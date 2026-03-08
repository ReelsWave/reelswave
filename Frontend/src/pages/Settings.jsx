import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, CreditCard, Zap, ArrowRight, Copy, Check } from 'lucide-react';
import './Settings.css';

function Settings({ session }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            setProfile(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const copyEmail = () => {
        navigator.clipboard.writeText(session.user.email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const PLAN_META = {
        free:      { label: 'Free Trial',  color: '#9898a8', videos: '3 videos total',    upgrade: true },
        basic:     { label: 'Basic',        color: '#eab308', videos: '3 videos / week',   upgrade: true },
        pro:       { label: 'Pro',           color: '#00b2cb', videos: '1 video / day',     upgrade: false },
        dedicated: { label: 'Dedicated',    color: '#a855f7', videos: '3 videos / day',    upgrade: false },
    };

    const plan = profile?.plan || 'free';
    const meta = PLAN_META[plan] || PLAN_META.free;

    if (loading) {
        return (
            <div className="settings-page flex items-center justify-center">
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    return (
        <div className="settings-page page-enter">
            <div className="container st-container">

                <div className="st-header animate-slide-up">
                    <h2>Settings</h2>
                    <p>Manage your account and subscription</p>
                </div>

                {/* Account */}
                <div className="st-card animate-slide-up" style={{ animationDelay: '0.05s' }}>
                    <div className="st-card-label">
                        <User size={13} />
                        <span>Account</span>
                    </div>

                    <div className="st-account-row">
                        <div className="st-avatar">
                            {session.user.email?.[0].toUpperCase()}
                        </div>
                        <div className="st-account-info">
                            <div className="st-email-row">
                                <span className="st-email">{session.user.email}</span>
                                <button className="st-copy-btn" onClick={copyEmail} title="Copy email">
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                            <span className="st-uid">ID: {session.user.id.slice(0, 16)}…</span>
                        </div>
                    </div>
                </div>

                {/* Plan & Credits */}
                <div className="st-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="st-card-label">
                        <CreditCard size={13} />
                        <span>Subscription</span>
                    </div>

                    <div className="st-plan-row">
                        <div className="st-plan-left">
                            <div className="st-plan-badge" style={{ '--pc': meta.color }}>
                                {meta.label}
                            </div>
                            <span className="st-plan-videos">{meta.videos}</span>
                        </div>
                        <div className="st-credits-block">
                            <span className="st-credits-num">{profile?.credits ?? 0}</span>
                            <span className="st-credits-label">credits left</span>
                        </div>
                    </div>

                    {meta.upgrade && (
                        <a href="/#pricing" className="st-upgrade-btn">
                            <Zap size={15} />
                            Upgrade Plan
                            <ArrowRight size={14} />
                        </a>
                    )}
                </div>

                {/* Quick Links */}
                <div className="st-card animate-slide-up" style={{ animationDelay: '0.15s' }}>
                    <div className="st-card-label">
                        <Zap size={13} />
                        <span>Quick Links</span>
                    </div>

                    <div className="st-links">
                        <Link to="/create" className="st-link-row">
                            <span>Create a new video</span>
                            <ArrowRight size={15} />
                        </Link>
                        <Link to="/autopilot" className="st-link-row">
                            <span>Automatic Growth settings</span>
                            <ArrowRight size={15} />
                        </Link>
                        <Link to="/dashboard" className="st-link-row">
                            <span>View your videos</span>
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Settings;
