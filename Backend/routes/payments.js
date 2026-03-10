import express from 'express';
import crypto from 'crypto';
import { authMiddleware, supabase } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const LEMONSQUEEZY_API = 'https://api.lemonsqueezy.com/v1';
const headers = {
    'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    'Content-Type': 'application/vnd.api+json',
    'Accept': 'application/vnd.api+json'
};

// Plan configurations — update variant IDs after creating products in LemonSqueezy
const PLANS = {
    basic: {
        name: 'Basic',
        monthlyVariantId: process.env.LS_BASIC_VARIANT_ID,
        yearlyVariantId: process.env.LS_BASIC_YEARLY_VARIANT_ID,
        credits: 12, // 3 per week * 4
        price: 9
    },
    pro: {
        name: 'Pro',
        monthlyVariantId: process.env.LS_PRO_VARIANT_ID,
        yearlyVariantId: process.env.LS_PRO_YEARLY_VARIANT_ID,
        credits: 30, // 1 per day
        price: 29
    },
    dedicated: {
        name: 'Dedicated',
        monthlyVariantId: process.env.LS_DEDICATED_VARIANT_ID,
        yearlyVariantId: process.env.LS_DEDICATED_YEARLY_VARIANT_ID,
        credits: 90, // 3 per day
        price: 59
    }
};

/**
 * GET /api/payments/plans
 */
router.get('/plans', (req, res) => {
    res.json({ plans: PLANS });
});

/**
 * POST /api/payments/create-checkout
 * Create LemonSqueezy checkout URL
 */
router.post('/create-checkout', authMiddleware, async (req, res) => {
    try {
        const { planId, billing = 'monthly' } = req.body;
        const plan = PLANS[planId];

        const variantId = billing === 'yearly' ? plan?.yearlyVariantId : plan?.monthlyVariantId;

        if (!plan || !variantId) {
            return res.status(400).json({ error: 'Invalid plan or billing cycle' });
        }

        const response = await fetch(`${LEMONSQUEEZY_API}/checkouts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                data: {
                    type: 'checkouts',
                    attributes: {
                        checkout_data: {
                            custom: {
                                user_id: req.user.id,
                                plan_id: planId
                            }
                        },
                        product_options: {
                            redirect_url: `${process.env.FRONTEND_URL}/dashboard?success=true`
                        }
                    },
                    relationships: {
                        store: {
                            data: { type: 'stores', id: process.env.LS_STORE_ID }
                        },
                        variant: {
                            data: { type: 'variants', id: variantId }
                        }
                    }
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.errors?.[0]?.detail || 'Checkout creation failed');
        }

        res.json({ url: data.data.attributes.url });
    } catch (err) {
        console.error('Checkout error:', err.message);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

/**
 * POST /api/payments/webhook
 * Handle LemonSqueezy webhook events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    // Verify webhook signature
    const secret = process.env.LS_WEBHOOK_SECRET;
    const signature = req.headers['x-signature'];

    if (secret && signature) {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(req.body).digest('hex');

        if (signature !== digest) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    const payload = JSON.parse(req.body);

    // DEBUGGING LOG
    console.log("=== LEMON SQUEEZY WEBHOOK RECEIVED ===");
    console.log("Event:", payload.meta?.event_name);
    console.log("Custom Data:", payload.meta?.custom_data);
    console.log("Customer ID:", payload.data?.attributes?.customer_id);
    console.log("======================================");
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data;

    switch (eventName) {
        case 'subscription_created': {
            const userId = customData?.user_id;
            const planId = customData?.plan_id;
            const plan = PLANS[planId];

            if (userId && plan) {
                await supabase
                    .from('profiles')
                    .update({
                        plan: planId,
                        credits: plan.credits,
                        ls_customer_id: String(payload.data.attributes.customer_id),
                        ls_subscription_id: String(payload.data.id)
                    })
                    .eq('id', userId);
            }
            break;
        }

        case 'subscription_payment_success': {
            // Recurring payment — refresh credits
            const customerId = String(payload.data.attributes.customer_id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('ls_customer_id', customerId)
                .single();

            if (profile) {
                const plan = PLANS[profile.plan];
                if (plan) {
                    await supabase
                        .from('profiles')
                        .update({ credits: plan.credits })
                        .eq('id', profile.id);
                }
            }
            break;
        }

        case 'subscription_updated': {
            const customerId = String(payload.data.attributes.customer_id);
            const variantId  = String(payload.data.attributes.variant_id);

            // Map variant ID back to a plan
            let newPlanId = null;
            for (const [id, plan] of Object.entries(PLANS)) {
                if (String(plan.monthlyVariantId) === variantId || String(plan.yearlyVariantId) === variantId) {
                    newPlanId = id;
                    break;
                }
            }

            if (newPlanId) {
                await supabase
                    .from('profiles')
                    .update({ plan: newPlanId, credits: PLANS[newPlanId].credits })
                    .eq('ls_customer_id', customerId);
            }
            break;
        }

        case 'subscription_cancelled':
        case 'subscription_expired': {
            const customerId = String(payload.data.attributes.customer_id);

            await supabase
                .from('profiles')
                .update({ plan: 'free', credits: 0, ls_subscription_id: null })
                .eq('ls_customer_id', customerId);
            break;
        }
    }

    res.json({ received: true });
});

/**
 * GET /api/payments/subscription
 * Return current subscription details + billing portal URL
 */
router.get('/subscription', authMiddleware, async (req, res) => {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan, ls_subscription_id')
            .eq('id', req.user.id)
            .single();

        if (!profile?.ls_subscription_id) {
            return res.json({ status: 'none' });
        }

        const lsRes = await fetch(`${LEMONSQUEEZY_API}/subscriptions/${profile.ls_subscription_id}`, { headers });

        if (!lsRes.ok) {
            return res.json({ status: 'none' });
        }

        const { data } = await lsRes.json();
        const attrs = data.attributes;

        // Detect billing cycle
        const variantId = String(attrs.variant_id);
        let billingCycle = 'monthly';
        for (const plan of Object.values(PLANS)) {
            if (String(plan.yearlyVariantId) === variantId) {
                billingCycle = 'yearly';
                break;
            }
        }

        res.json({
            status: attrs.status,
            renews_at: attrs.renews_at,
            ends_at: attrs.ends_at,
            billing_cycle: billingCycle,
            customer_portal_url: attrs.urls?.customer_portal || null
        });
    } catch (err) {
        console.error('Subscription fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch subscription details' });
    }
});

export default router;
