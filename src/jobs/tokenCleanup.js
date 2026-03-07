const db = require('../config/database');

const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // Every 6 hours

async function cleanupExpiredTokens() {
  try {
    const result = await db.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true'
    );
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'token_cleanup',
      deleted: result.rowCount,
    }));
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'token_cleanup_error',
      error: err.message,
    }));
  }
}

function startTokenCleanup() {
  // Run once on startup
  cleanupExpiredTokens();
  // Then repeat on interval
  setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);
}

module.exports = { startTokenCleanup };
