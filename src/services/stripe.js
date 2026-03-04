const env = require('../config/env');

let stripe = null;
function getStripe() {
  if (!stripe && env.stripe.secretKey) {
    stripe = require('stripe')(env.stripe.secretKey);
  }
  return stripe;
}

async function createCheckoutSession(user) {
  const s = getStripe();
  if (!s) throw Object.assign(new Error('Billing not configured'), { status: 503 });

  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.stripe_customer_id ? undefined : user.email,
    customer: user.stripe_customer_id || undefined,
    line_items: [{ price: env.stripe.proPriceId, quantity: 1 }],
    success_url: `${env.appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/pricing`,
    metadata: { userId: String(user.id) },
  });

  return session;
}

async function createPortalSession(customerId) {
  const s = getStripe();
  if (!s) throw Object.assign(new Error('Billing not configured'), { status: 503 });

  const session = await s.billingPortal.sessions.create({
    customer: customerId,
    return_url: env.appUrl,
  });

  return session;
}

function constructWebhookEvent(body, signature) {
  const s = getStripe();
  return s.webhooks.constructEvent(body, signature, env.stripe.webhookSecret);
}

module.exports = { createCheckoutSession, createPortalSession, constructWebhookEvent };
