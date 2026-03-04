const env = require('../config/env');

const VALID_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

async function verifyGoogleToken(idToken) {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!res.ok) {
    throw Object.assign(new Error('Invalid Google token'), { status: 401 });
  }

  const payload = await res.json();

  // Verify audience matches our client ID
  if (payload.aud !== env.googleClientId) {
    throw Object.assign(new Error('Token audience mismatch'), { status: 401 });
  }

  // Verify issuer
  if (!VALID_ISSUERS.includes(payload.iss)) {
    throw Object.assign(new Error('Token issuer mismatch'), { status: 401 });
  }

  // Verify token is not expired
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && parseInt(payload.exp, 10) < now) {
    throw Object.assign(new Error('Token expired'), { status: 401 });
  }

  // Verify email is verified
  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw Object.assign(new Error('Email not verified'), { status: 401 });
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
  };
}

module.exports = { verifyGoogleToken };
