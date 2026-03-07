const db = require('../config/database');
const { hardDeleteExpiredUsers } = require('../services/user');

const CLEANUP_INTERVAL = 1 * 60 * 60 * 1000; // Every 1 hour

async function cleanupExpiredUsers() {
  try {
    const deletedIds = await hardDeleteExpiredUsers();

    if (deletedIds.length > 0) {
      // Clean up audit log entries for hard-deleted users
      await db.query(
        'DELETE FROM audit_log WHERE user_id = ANY($1::int[])',
        [deletedIds]
      );
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'user_cleanup',
      deleted: deletedIds.length,
      deletedIds,
    }));
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'user_cleanup_error',
      error: err.message,
    }));
  }
}

function startUserCleanup() {
  // Run once on startup
  cleanupExpiredUsers();
  // Then repeat on interval
  setInterval(cleanupExpiredUsers, CLEANUP_INTERVAL);
}

module.exports = { startUserCleanup };
