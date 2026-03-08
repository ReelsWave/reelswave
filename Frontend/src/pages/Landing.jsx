import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Ghost, Brain, Lightbulb, TrendingUp, Dumbbell, ChefHat, Atom, Sparkles, Mic, PenLine, Smartphone, MessageSquareText, Hash, Zap, Play, ArrowRight, Check, Star, Youtube, Instagram, Music2, Radio } from 'lucide-react';
import PremiumButton from '../components/PremiumButton';
import './Landing.css';

const NICHES = [
    { icon: Flame, name: 'Motivational', desc: 'Inspiring speeches paired with cinematic, high-contrast visuals.', color: '#f97316' },
    { icon: Ghost, name: 'Scary Stories', desc: 'Creepy narrations over unsettling, dark AI-generated atmospheres.', color: '#a855f7' },
    { icon: Brain, name: 'Fun Facts', desc: 'Engaging trivia with rapid-fire, visually stimulating background loops.', color: '#06b6d4' },
    { icon: Lightbulb, name: 'Life Hacks', desc: 'Quick, practical tips demonstrated through clean, explanatory scenes.', color: '#eab308' },
    { icon: TrendingUp, name: 'Finance Tips', desc: 'Wealth-building strategies explained with luxury and analytical imagery.', color: '#22c55e' },
    { icon: Dumbbell, name: 'Fitness', desc: 'Workout advice accompanied by intense, high-energy stock footage.', color: '#ef4444' },
    { icon: ChefHat, name: 'Cooking', desc: 'Recipe narrations over mouth-watering, hyper-realistic food generation.', color: '#f59e0b' },
    { icon: Atom, name: 'Science', desc: 'Mind-blowing concepts visualized with ethereal, futuristic graphics.', color: '#818cf8' },
];

const FEATURES = [
    { icon: Sparkles, title: 'Unlimited Series', desc: 'Dominate multiple niches simultaneously. Run 5, 10, or 20 content series without hitting a single bottleneck.', accent: '#a855f7' },
    { icon: Mic, title: 'Studio Voices', desc: 'Human-grade narration that captures emotion and drives engagement. Powered by world-class AI models.', accent: '#06b6d4' },
    { icon: PenLine, title: 'Cloud Editor', desc: 'Fine-tune your narratives with a simple, powerful editor before your video goes into production.', accent: '#f97316' },
    { icon: Smartphone, title: '9:16 Architecture', desc: 'Engineered from the ground up for the short-form era. Perfectly framed for TikTok, Reels, and Shorts.', accent: '#22c55e' },
    { icon: MessageSquareText, title: 'Smart Captions', desc: 'Retention-optimized animated captions that keep viewers glued to the screen until the very last second.', accent: '#eab308' },
    { icon: Hash, title: 'Viral Metadata', desc: 'Our engine generates the hashtags and hooks proven to trigger the algorithm and maximize organic reach.', accent: '#ef4444' },
];

const PRICES = {
    monthly: { basic: 9, pro: 29, dedicated: 59 },
    yearly:  { basic: 65, pro: 199, dedicated: 399 },
};

function Landing({ session }) {
    const navigate = useNavigate();
    const [billing, setBilling] = useState('monthly');

    const price = PRICES[billing];
    const moEquiv = {
        basic:     (PRICES.yearly.basic     / 12).toFixed(2),
        pro:       (PRICES.yearly.pro       / 12).toFixed(2),
        dedicated: (PRICES.yearly.dedicated / 12).toFixed(2),
    };

    return (
        <div className="landing">
            {/* Hero Section */}
            <section className="hero ups-hero">
                <div className="hero-glow ups-glow"></div>
                <div className="container hero-content ups-content">
                    <div className="badge badge-upscayl animate-fade-in">
                        <span className="status-dot" style={{ backgroundColor: 'var(--accent)' }}></span> 🚀 AI-Powered Video Generation
                    </div>

                    <h1 className="hero-title ups-title animate-slide-up" style={{ lineHeight: '1.1' }}>
                        Create Viral Faceless Videos<br />
                        <span className="gradient-text" style={{ fontSize: '0.65em' }}>In Seconds, Not Hours</span>
                    </h1>

                    <p className="hero-subtitle ups-subtitle animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        Generate scroll-stopping TikToks, Reels & Shorts with AI scripts, premium voiceovers, and cinematic footage — completely hands-free.
                    </p>

                    <div className="hero-cta ups-cta animate-slide-up" style={{ animationDelay: '0.2s', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <PremiumButton onClick={() => navigate(session ? '/create' : '/signup')}>
                            Start Creating Free
                        </PremiumButton>
                        <PremiumButton onClick={() => window.location.href = '#how-it-works'}>
                            See How It Works
                        </PremiumButton>
                    </div>

                    {/* Hero Media Showcase representing Reels/Shorts */}
                    <div className="hero-showcase animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <div className="phone-mockup" style={{ backgroundImage: 'url(/styles/tokyo_anime.jpg)' }}>
                            <div className="play-icon">▶</div>
                        </div>
                        <div className="phone-mockup featured" style={{ backgroundImage: 'url(/styles/cinematic.jpg)' }}>
                            <div className="play-icon">▶</div>
                        </div>
                        <div className="phone-mockup" style={{ backgroundImage: 'url(/styles/ethereal_dream.jpg)' }}>
                            <div className="play-icon">▶</div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Niches Section */}
            <section className="section niches-section">
                <div className="container text-center">
                    <div className="badge badge-accent" style={{ marginBottom: 16 }}>Content Niches</div>
                    <h2 className="section-title">Pick Your Niche, <span className="gradient-text">We Handle The Rest</span></h2>
                    <p className="section-subtitle">Choose from trending content categories that get millions of views</p>
                    <div className="niche-grid-v2 animate-slide-up">
                        {NICHES.map(niche => {
                            const Icon = niche.icon;
                            return (
                                <div key={niche.name} className="niche-card-v2" style={{ '--niche-color': niche.color }}>
                                    <div className="niche-card-glow" />
                                    <div className="niche-icon-wrap">
                                        <Icon size={28} strokeWidth={1.5} />
                                    </div>
                                    <h4>{niche.name}</h4>
                                    <p>{niche.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="section how-it-works-section">
                <div className="container text-center">
                    <div className="badge badge-accent" style={{ marginBottom: 16 }}>Simple Process</div>
                    <h2 className="section-title">From Idea to Viral Video <span className="gradient-text">in 3 Steps</span></h2>
                    <p className="section-subtitle">No editing skills. No camera. No experience needed.</p>

                    <div className="steps-row animate-slide-up">
                        <div className="step-v2">
                            <div className="step-v2-number"><span>01</span></div>
                            <div className="step-v2-content">
                                <h3>Pick Your Topic</h3>
                                <p>Choose a niche and describe your video topic. Our AI understands what goes viral.</p>
                            </div>
                            <div className="step-v2-visual">
                                <Zap size={40} strokeWidth={1} className="step-v2-icon" />
                            </div>
                        </div>
                        <div className="step-connector"><ArrowRight size={20} /></div>
                        <div className="step-v2">
                            <div className="step-v2-number"><span>02</span></div>
                            <div className="step-v2-content">
                                <h3>AI Does The Work</h3>
                                <p>Our engine crafts the script, generates professional narration, and creates cinematic footage.</p>
                            </div>
                            <div className="step-v2-visual">
                                <Sparkles size={40} strokeWidth={1} className="step-v2-icon" />
                            </div>
                        </div>
                        <div className="step-connector"><ArrowRight size={20} /></div>
                        <div className="step-v2">
                            <div className="step-v2-number"><span>03</span></div>
                            <div className="step-v2-content">
                                <h3>Download & Post</h3>
                                <p>Get your ready-to-post video with captions and hashtags. Just upload to any platform!</p>
                            </div>
                            <div className="step-v2-visual">
                                <Play size={40} strokeWidth={1} className="step-v2-icon" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="section features-section-v2">
                <div className="container text-center">
                    <div className="badge badge-accent" style={{ marginBottom: 16 }}>Platform Features</div>
                    <h2 className="section-title">Why Creators Choose <span className="gradient-text">ReelsWave</span></h2>
                    <p className="section-subtitle">Everything you need to build a faceless content empire</p>

                    <div className="ft-grid animate-slide-up">
                        {FEATURES.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div key={feature.title} className="ft-card" style={{ '--ft': feature.accent }}>
                                    <div className="ft-orb" />
                                    <div className="ft-top-line" />
                                    <div className="ft-icon-ring">
                                        <div className="ft-icon-inner">
                                            <Icon size={26} strokeWidth={1.5} />
                                        </div>
                                    </div>
                                    <h3 className="ft-title">{feature.title}</h3>
                                    <p className="ft-desc">{feature.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Automatic Growth Showcase */}
            <section id="automatic-growth" className="section ag-section">
                <div className="ag-bg-orb ag-orb-left" />
                <div className="ag-bg-orb ag-orb-right" />
                <div className="container ag-container">
                    <div className="ag-left animate-slide-up">
                        <div className="badge badge-accent" style={{ marginBottom: 16 }}>
                            <span className="status-dot" style={{ backgroundColor: 'var(--accent)', width: 6, height: 6, borderRadius: '50%', display: 'inline-block', marginRight: 6, animation: 'pulse 2s ease-in-out infinite' }}></span>
                            Automatic Growth
                        </div>
                        <h2 className="section-title ag-title">
                            Your Channel Grows<br />
                            <span className="gradient-text">While You Sleep</span>
                        </h2>
                        <p className="section-subtitle ag-desc">
                            Connect your channels once. ReelsWave generates a fresh AI video and
                            publishes it automatically — every single day, 365 days a year. No login required.
                        </p>
                        <div className="ag-platform-row">
                            {[
                                { Icon: Youtube, color: '#ff4444', label: 'YouTube Shorts' },
                                { Icon: Music2, color: '#00f2ea', label: 'TikTok' },
                                { Icon: Instagram, color: '#e1306c', label: 'Instagram Reels' },
                            ].map(({ Icon, color, label }) => (
                                <div key={label} className="ag-platform-chip" style={{ '--apc': color }}>
                                    <Icon size={15} strokeWidth={1.5} />
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                        <Link to={session ? '/autopilot' : '/signup'} className="ag-cta">
                            <Radio size={16} />
                            Set Up Auto Growth
                            <ArrowRight size={16} />
                        </Link>
                        <p className="ag-plan-note">Exclusive to Pro &amp; Dedicated plans</p>
                    </div>

                    <div className="ag-right animate-slide-up" style={{ animationDelay: '0.15s' }}>
                        <div className="ag-mockup">
                            <div className="ag-mockup-glow" />
                            {/* Engine Status Card */}
                            <div className="ag-card ag-status-card">
                                <div className="ag-card-row">
                                    <div className="ag-live-badge">
                                        <span className="ag-live-dot" />
                                        Engine Running
                                    </div>
                                    <span className="ag-card-time">Daily · 09:00 UTC</span>
                                </div>
                                <div className="ag-card-series">
                                    <span className="ag-series-emoji">🧠</span>
                                    <div>
                                        <div className="ag-series-name">Fun Facts Series</div>
                                        <div className="ag-series-sub">Next post in 4h 22m</div>
                                    </div>
                                    <div className="ag-series-streak">
                                        <Zap size={12} />
                                        <span>32 day streak</span>
                                    </div>
                                </div>
                            </div>
                            {/* Platform Status Cards */}
                            <div className="ag-plat-row">
                                {[
                                    { Icon: Youtube, color: '#ff4444', name: 'YouTube', count: '12.4K views' },
                                    { Icon: Music2, color: '#00f2ea', name: 'TikTok', count: '31.8K views' },
                                    { Icon: Instagram, color: '#e1306c', name: 'Instagram', count: '8.2K views' },
                                ].map(({ Icon, color, name, count }) => (
                                    <div key={name} className="ag-plat-mini" style={{ '--apc': color }}>
                                        <div className="ag-plat-mini-icon">
                                            <Icon size={16} strokeWidth={1.5} />
                                        </div>
                                        <div className="ag-plat-mini-info">
                                            <div className="ag-plat-mini-name">{name}</div>
                                            <div className="ag-plat-mini-stat">{count}</div>
                                        </div>
                                        <div className="ag-plat-mini-dot" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="section pricing-section-v2">
                <div className="container text-center">
                    <div className="badge badge-accent" style={{ marginBottom: 16 }}>Pricing</div>
                    <h2 className="section-title">Simple, <span className="gradient-text">Transparent</span> Pricing</h2>
                    <p className="section-subtitle">Pick your pace. Cancel anytime.</p>

                    {/* Billing toggle */}
                    <div className="billing-toggle animate-fade-in">
                        <button
                            className={`billing-opt ${billing === 'monthly' ? 'active' : ''}`}
                            onClick={() => setBilling('monthly')}
                        >Monthly</button>
                        <button
                            className={`billing-opt ${billing === 'yearly' ? 'active' : ''}`}
                            onClick={() => setBilling('yearly')}
                        >
                            Yearly
                            <span className="billing-save-badge">Save 40%</span>
                        </button>
                    </div>

                    <div className="pricing-grid-v2 animate-slide-up">
                        {/* Basic */}
                        <div className="price-card-v2">
                            <div className="price-card-inner">
                                <div className="price-tier">Basic</div>
                                <div className="price-amount">
                                    {billing === 'yearly'
                                        ? <>${moEquiv.basic}<span>/mo</span></>
                                        : <>${price.basic}<span>/mo</span></>}
                                </div>
                                {billing === 'yearly' && (
                                    <div className="price-billed-yearly">${price.basic} billed yearly</div>
                                )}
                                <div className="price-period">3 videos per week</div>
                                <div className="price-divider" />
                                <ul className="price-list">
                                    <li><Check size={16} /> <span>3 videos / week</span></li>
                                    <li><Check size={16} /> <span>All niches &amp; styles</span></li>
                                    <li><Check size={16} /> <span>AI script &amp; voiceover</span></li>
                                    <li><Check size={16} /> <span>No watermark</span></li>
                                    <li><Check size={16} /> <span>720p export</span></li>
                                </ul>
                                <Link to={`/checkout?plan=basic&billing=${billing}`} className="price-btn">Get Basic</Link>
                            </div>
                        </div>

                        {/* Pro - Featured */}
                        <div className="price-card-v2 featured">
                            <div className="price-card-glow" />
                            <div className="featured-badge"><Star size={12} /> Most Popular</div>
                            <div className="price-card-inner">
                                <div className="price-tier">Pro</div>
                                <div className="price-amount">
                                    {billing === 'yearly'
                                        ? <>${moEquiv.pro}<span>/mo</span></>
                                        : <>${price.pro}<span>/mo</span></>}
                                </div>
                                {billing === 'yearly' && (
                                    <div className="price-billed-yearly">${price.pro} billed yearly</div>
                                )}
                                <div className="price-period">Post every single day</div>
                                <div className="price-divider" />
                                <ul className="price-list">
                                    <li><Check size={16} /> <span>1 video per day</span></li>
                                    <li><Check size={16} /> <span>All niches &amp; styles</span></li>
                                    <li><Check size={16} /> <span>Premium AI voices</span></li>
                                    <li><Check size={16} /> <span>No watermark</span></li>
                                    <li><Check size={16} /> <span>1080p export</span></li>
                                    <li className="highlight"><Zap size={14} /> <span>Automatic Growth</span></li>
                                </ul>
                                <Link to={`/checkout?plan=pro&billing=${billing}`} className="price-btn primary">Get Pro</Link>
                            </div>
                        </div>

                        {/* Dedicated */}
                        <div className="price-card-v2">
                            <div className="price-card-inner">
                                <div className="price-tier">Dedicated</div>
                                <div className="price-amount">
                                    {billing === 'yearly'
                                        ? <>${moEquiv.dedicated}<span>/mo</span></>
                                        : <>${price.dedicated}<span>/mo</span></>}
                                </div>
                                {billing === 'yearly' && (
                                    <div className="price-billed-yearly">${price.dedicated} billed yearly</div>
                                )}
                                <div className="price-period">3 videos every day</div>
                                <div className="price-divider" />
                                <ul className="price-list">
                                    <li><Check size={16} /> <span>3 videos per day</span></li>
                                    <li><Check size={16} /> <span>All niches &amp; styles</span></li>
                                    <li><Check size={16} /> <span>Priority rendering</span></li>
                                    <li><Check size={16} /> <span>No watermark</span></li>
                                    <li><Check size={16} /> <span>1080p export</span></li>
                                    <li className="highlight"><Zap size={14} /> <span>Automatic Growth (3×/day)</span></li>
                                </ul>
                                <Link to={`/checkout?plan=dedicated&billing=${billing}`} className="price-btn">Get Dedicated</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section cta-section-v2">
                <div className="cta-glow-orb" />
                <div className="container text-center" style={{ position: 'relative', zIndex: 2 }}>
                    <h2 className="cta-title">
                        Ready to <span className="gradient-text">Go Viral</span>?
                    </h2>
                    <p className="cta-desc">
                        Join thousands of creators growing their accounts on autopilot with AI-generated content.
                    </p>
                    <Link to={session ? '/create' : '/signup'} className="cta-button">
                        <span>Create Your First Video Free</span>
                        <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer-v2">
                <div className="container">
                    <div className="footer-inner">
                        <div className="footer-brand-v2">
                            <span className="footer-logo">ReelsWave</span>
                            <span className="footer-tagline">AI-powered video generation for creators</span>
                        </div>
                        <div className="footer-links-v2">
                            <a href="#">Privacy</a>
                            <a href="#">Terms</a>
                            <a href="#">Support</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <span>&copy; 2026 ReelsWave. All rights reserved.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Landing;
