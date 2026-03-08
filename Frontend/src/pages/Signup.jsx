import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    plan: 'free',
                    credits: 0
                }
            }
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    };

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-card card text-center">
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>✉️</div>
                    <h2>Check Your Email</h2>
                    <p style={{ marginTop: 12 }}>
                        We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
                    </p>
                    <Link to="/login" className="btn btn-primary" style={{ marginTop: 24 }}>
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card card">
                <div className="auth-header">
                    <h2>Create Your Account</h2>
                    <p>Start creating viral videos for free</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button onClick={handleGoogleSignup} className="btn btn-secondary auth-google">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Sign up with Google
                </button>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <form onSubmit={handleSignup} className="auth-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <span className="spinner"></span> : 'Create Free Account'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;
