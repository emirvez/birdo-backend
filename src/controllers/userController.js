const { getUserById, softDeleteUser, updateUserStripe } = require('../services/user');
const { getDailyUsage } = require('../services/usage');
const env = require('../config/env');
const db = require('../config/database');

async function getMe(req, res) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      createdAt: user.created_at,
      paymentGraceUntil: user.payment_grace_until || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUsage(req, res) {
  try {
    const user = await getUserById(req.user.id);
    const used = await getDailyUsage(req.user.id);

    let effectiveTier = user.tier;
    let limit;

    if (user.payment_grace_until && new Date(user.payment_grace_until) > new Date()) {
      // Active grace period: 100 replies/day
      limit = 100;
    } else if (user.payment_grace_until && new Date(user.payment_grace_until) <= new Date() && user.tier === 'pro') {
      // Grace period expired, still marked pro: lazy downgrade
      await updateUserStripe(req.user.id, { tier: 'free' });
      await db.query('UPDATE users SET payment_grace_until = NULL WHERE id = $1', [req.user.id]);
      effectiveTier = 'free';
      limit = 25;
    } else {
      limit = user.tier === 'pro' ? 10000 : 25;
    }

    res.json({ used, limit, tier: effectiveTier });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteMe(req, res) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Cancel Stripe subscription if exists
    if (user.stripe_subscription_id) {
      try {
        const stripe = require('stripe')(env.stripe.secretKey);
        await stripe.subscriptions.cancel(user.stripe_subscription_id);
      } catch (stripeErr) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'stripe_cancel_error',
          userId: user.id,
          error: stripeErr.message,
        }));
        // Continue with deletion even if Stripe cancel fails
      }
    }

    await softDeleteUser(req.user.id);

    res.json({ success: true, message: 'Account scheduled for deletion in 7 days. Log back in to cancel.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getMe, getUsage, deleteMe };
