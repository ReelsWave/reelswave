import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import './Checkout.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PRICES = {
    monthly: { basic: 9, pro: 29, dedicated: 59 },
    yearly: { basic: 65, pro: 199, dedicated: 399 }
};

const PLAN_NAMES = {
    basic: 'Basic',
    pro: 'Pro',
    dedicated: 'Dedicated'
};

function Checkout({ session }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const planId = searchParams.get('plan') || 'pro';
    const billing = searchParams.get('billing') || 'monthly';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Validate inputs immediately
    useEffect(() => {
        if (!PRICES[billing] || !PRICES[billing][planId]) {
            navigate('/#pricing');
        }
    }, [planId, billing, navigate]);

    const price = PRICES[billing]?.[planId] || 0;
    const planName = PLAN_NAMES[planId] || 'Pro';

    const handleCheckout = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/payments/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    planId,
                    billing
                })
            });

            const data = await res.json();

            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                setError(data.error || 'Failed to initialize secure checkout. Please try again.');
            }
        } catch (err) {
            console.error('Checkout creation error:', err);
            setError('A network error occurred connecting to the billing provider.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkout-page page-enter">
            <div className="checkout-container animate-slide-up">

                <div className="checkout-icon">
                    <CreditCard size={32} />
                </div>

                <h2 className="checkout-title">Complete your Upgrade</h2>
                <p className="checkout-subtitle">Secure checkout powered by Lemon Squeezy</p>

                {error && (
                    <div className="badge badge-accent" style={{ marginBottom: '24px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="checkout-summary">
                    <div className="checkout-row">
                        <span className="checkout-label">Plan Details</span>
                        <span className="checkout-value">{planName} Plan</span>
                    </div>
                    <div className="checkout-row">
                        <span className="checkout-label">Billing Cycle</span>
                        <span className="checkout-value">{billing}</span>
                    </div>
                    <div className="checkout-row">
                        <span className="checkout-label">Total Due Today</span>
                        <div className="checkout-total-value">
                            ${price} <span className="checkout-total-period">/ {billing === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>
                    </div>
                </div>

                <button
                    className="btn btn-primary checkout-btn"
                    onClick={handleCheckout}
                    disabled={loading}
                >
                    {loading ? (
                        <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Preparing Checkout...</>
                    ) : (
                        <>Proceed to Payment <ArrowRight size={18} /></>
                    )}
                </button>

                <div className="checkout-secure-note">
                    <Lock size={14} /> Guaranteed secure & encrypted checkout
                </div>
            </div>
        </div>
    );
}

export default Checkout;
