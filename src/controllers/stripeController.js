const { getUserById, updateUserStripe } = require('../services/user');
const { createCheckoutSession, createPortalSession, constructWebhookEvent } = require('../services/stripe');
const db = require('../config/database');

async function checkout(req, res) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.tier === 'pro') return res.status(400).json({ error: 'Already on Pro' });

    const session = await createCheckoutSession(user);
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function portal(req, res) {
  try {
    const user = await getUserById(req.user.id);
    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await createPortalSession(user.stripe_customer_id);
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function webhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error('Webhook verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = parseInt(session.metadata?.userId, 10);
      if (!userId || isNaN(userId)) break;

      await updateUserStripe(userId, {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        tier: 'pro',
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const result = await db.query(
        'SELECT id FROM users WHERE stripe_subscription_id = $1',
        [sub.id]
      );
      if (result.rows[0]) {
        await updateUserStripe(result.rows[0].id, { tier: 'free', stripeSubscriptionId: null });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const result = await db.query(
        'SELECT id, payment_grace_until FROM users WHERE stripe_subscription_id = $1',
        [sub.id]
      );
      if (result.rows[0]) {
        const user = result.rows[0];
        // Do not override tier during active grace period
        if (user.payment_grace_until && new Date(user.payment_grace_until) > new Date()) {
          break;
        }
        const tier = sub.status === 'active' ? 'pro' : 'free';
        await updateUserStripe(user.id, { tier });
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      // Only handle subscription-related invoices
      if (!invoice.subscription) break;

      const result = await db.query(
        'SELECT id FROM users WHERE stripe_customer_id = $1',
        [invoice.customer]
      );
      if (result.rows[0]) {
        const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.query(
          'UPDATE users SET payment_grace_until = $1, updated_at = NOW() WHERE id = $2',
          [graceUntil, result.rows[0].id]
        );
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (!invoice.subscription) break;

      const result = await db.query(
        'SELECT id FROM users WHERE stripe_customer_id = $1',
        [invoice.customer]
      );
      if (result.rows[0]) {
        await db.query(
          "UPDATE users SET payment_grace_until = NULL, tier = 'pro', updated_at = NOW() WHERE id = $1",
          [result.rows[0].id]
        );
      }
      break;
    }
  }

  res.json({ received: true });
}

module.exports = { checkout, portal, webhook };
