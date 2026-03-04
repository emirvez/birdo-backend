const db = require('../config/database');

const LIMITS = {
  free: 25,
  pro: 10000,
};

async function rateLimiter(req, res, next) {
  if (!req.user) return next();

  const { id, tier } = req.user;
  const limit = LIMITS[tier] || LIMITS.free;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const result = await db.query(
      `INSERT INTO daily_usage (user_id, usage_date, request_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, usage_date)
       DO UPDATE SET request_count = daily_usage.request_count + 1
       RETURNING request_count`,
      [id, today]
    );

    const count = result.rows[0].request_count;

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));

    if (count > limit) {
      return res.status(429).json({
        error: 'Daily limit reached',
        limit,
        used: count,
        tier,
        upgrade: tier === 'free' ? 'Upgrade to Pro for 10,000 requests/day' : undefined,
      });
    }

    next();
  } catch (err) {
    // Fail closed — deny request if rate limiting is broken
    console.error('Rate limiter error');
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
}

module.exports = rateLimiter;
