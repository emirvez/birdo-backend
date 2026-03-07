const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/database');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, email: payload.email, tier: payload.tier };

    // Check soft-delete status and attach grace period info
    const result = await db.query(
      'SELECT deleted_at, payment_grace_until FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userRow = result.rows[0];

    if (userRow.deleted_at) {
      return res.status(403).json({ error: 'Account pending deletion', code: 'ACCOUNT_DELETED' });
    }

    if (userRow.payment_grace_until) {
      req.user.paymentGraceUntil = userRow.payment_grace_until;
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authenticate;
