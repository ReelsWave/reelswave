import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Navbar.css';
import LaunchButton from './LaunchButton';
import logo from '../assets/newlogo.png';

function Navbar({ session }) {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="container navbar-inner">
                <Link to="/" className="navbar-logo">
                    <img src={logo} alt="ReelsWave Logo" className="logo-img" />
                </Link>

                {/* Center links change based on auth state */}
                <div className="navbar-center-links">
                    {session ? (
                        <>
                            <Link to="/dashboard" className="nav-link">Dashboard</Link>
                            <Link to="/autopilot" className="nav-link nav-link-growth">
                                <span className="nav-growth-dot" />
                                Auto Growth
                            </Link>
                            <Link to="/settings" className="nav-link">Settings</Link>
                        </>
                    ) : (
                        <>
                            <a href="#features" className="nav-link">Features</a>
                            <a href="#pricing" className="nav-link">Pricing</a>
                            <a href="#how-it-works" className="nav-link">How It Works</a>
                        </>
                    )}
                </div>

                {/* Right side: CTA only */}
                <div className="navbar-right-links">
                    {session ? (
                        <>
                            <LaunchButton onClick={() => navigate('/create')}>
                                Create Video
                            </LaunchButton>
                            <button onClick={handleLogout} className="btn-ghost-pill btn-sm">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link">Login</Link>
                            <LaunchButton onClick={() => navigate('/signup')}>
                                Get Started
                            </LaunchButton>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
