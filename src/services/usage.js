const db = require('../config/database');

async function getDailyUsage(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db.query(
    'SELECT request_count FROM daily_usage WHERE user_id = $1 AND usage_date = $2',
    [userId, today]
  );
  return result.rows[0]?.request_count || 0;
}

module.exports = { getDailyUsage };
