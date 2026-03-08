import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Dashboard({ session }) {
    const [videos, setVideos] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch videos from backend
            const videosRes = await fetch(`${API_URL}/api/videos`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const videosData = await videosRes.json();
            setVideos(videosData.videos || []);

            // Fetch profile from Supabase
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            setProfile(profileData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (videoId) => {
        if (!confirm('Delete this video?')) return;

        try {
            await fetch(`${API_URL}/api/videos/${videoId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            setVideos(videos.filter(v => v.id !== videoId));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const planLabels = {
        free: 'Free Trial',
        basic: 'Basic',
        pro: 'Pro',
        dedicated: 'Dedicated'
    };

    if (loading) {
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
            </div>
        );
    }

    return (
        <div className="dashboard-page page-enter">
            <div className="container">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <h2>Your Dashboard</h2>
                        <p>Manage your videos and account</p>
                    </div>
                    <Link to="/create" className="btn btn-primary">
                        + Create New Video
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-3 dashboard-stats">
                    <div className="card stat-card">
                        <p className="stat-label">Current Plan</p>
                        <h3 className="gradient-text">{planLabels[profile?.plan] || 'Free Trial'}</h3>
                    </div>
                    <div className="card stat-card">
                        <p className="stat-label">Credits Remaining</p>
                        <h3>{profile?.credits ?? 3}</h3>
                    </div>
                    <div className="card stat-card">
                        <p className="stat-label">Videos Created</p>
                        <h3>{videos.length}</h3>
                    </div>
                </div>

                {/* Videos Grid */}
                <div className="dashboard-section">
                    <h3>Your Videos</h3>

                    {videos.length === 0 ? (
                        <div className="empty-state card">
                            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎬</div>
                            <h4>No videos yet</h4>
                            <p>Create your first viral video in under 5 minutes!</p>
                            <Link to="/create" className="btn btn-primary" style={{ marginTop: 20 }}>
                                Create Your First Video
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-3 videos-grid">
                            {videos.map(video => (
                                <div key={video.id} className="card video-card">
                                    <div className="video-thumbnail">
                                        {video.video_url ? (
                                            <video src={video.video_url} muted preload="metadata" />
                                        ) : (
                                            <div className="video-placeholder">🎬</div>
                                        )}
                                        <div className="badge badge-success video-status">
                                            {video.status}
                                        </div>
                                    </div>
                                    <div className="video-info">
                                        <h4>{video.title}</h4>
                                        <p className="video-meta">
                                            {video.niche} • {new Date(video.created_at).toLocaleDateString()}
                                        </p>
                                        <div className="video-actions">
                                            {video.video_url && (
                                                <a
                                                    href={video.video_url}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    Download
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleDelete(video.id)}
                                                className="btn btn-ghost btn-sm"
                                                style={{ color: 'var(--danger)' }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
