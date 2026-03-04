const env = require('../config/env');

async function verifyGoogleToken(accessToken) {
  // chrome.identity.getAuthToken() returns an OAuth access token,
  // so we use Google's userinfo endpoint to get the user's profile
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw Object.assign(new Error('Invalid Google token'), { status: 401 });
  }

  const payload = await res.json();

  if (!payload.sub || !payload.email) {
    throw Object.assign(new Error('Incomplete Google profile'), { status: 401 });
  }

  // Verify email is verified
  if (!payload.email_verified) {
    throw Object.assign(new Error('Email not verified'), { status: 401 });
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
  };
}

module.exports = { verifyGoogleToken };
