const { getUserById, updateUserStripe } = require('../services/user');
const { createCheckoutSession, createPortalSession, constructWebhookEvent } = require('../services/stripe');
const db = require('../config/database');

async function checkout(req, res) {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.tier === 'pro') return res.status(400).json({ error: 'Already on Pro' });

  const session = await createCheckoutSession(user);
  res.json({ url: session.url });
}

async function portal(req, res) {
  const user = await getUserById(req.user.id);
  if (!user?.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const session = await createPortalSession(user.stripe_customer_id);
  res.json({ url: session.url });
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
        'SELECT id FROM users WHERE stripe_subscription_id = $1',
        [sub.id]
      );
      if (result.rows[0]) {
        const tier = sub.status === 'active' ? 'pro' : 'free';
        await updateUserStripe(result.rows[0].id, { tier });
      }
      break;
    }
    case 'invoice.payment_failed': {
      console.warn('Payment failed for a customer');
      break;
    }
  }

  res.json({ received: true });
}

module.exports = { checkout, portal, webhook };
