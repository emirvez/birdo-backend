const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/database');
const { verifyGoogleToken } = require('../services/google');
const { findOrCreateUser } = require('../services/user');

const JWT_ALGORITHM = 'HS256';

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, tier: user.tier },
    env.jwtAccessSecret,
    { algorithm: JWT_ALGORITHM, expiresIn: '1h' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    env.jwtRefreshSecret,
    { algorithm: JWT_ALGORITHM, expiresIn: '30d' }
  );
}

async function storeRefreshToken(userId, token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  );
}

async function googleLogin(req, res) {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid Google token' });
  }

  const googleUser = await verifyGoogleToken(token);
  const user = await findOrCreateUser(googleUser);

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await storeRefreshToken(user.id, refreshToken);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, tier: user.tier },
  });
}

async function refreshAccessToken(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Missing refresh token' });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret, { algorithms: [JWT_ALGORITHM] });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  if (payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid token type' });
  }

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const result = await db.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()',
    [hash]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Refresh token revoked or expired' });
  }

  // Get fresh user data
  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  if (userResult.rows.length === 0) {
    return res.status(401).json({ error: 'User not found' });
  }

  const user = userResult.rows[0];
  const accessToken = signAccessToken(user);

  res.json({ accessToken });
}

module.exports = { googleLogin, refreshAccessToken };
