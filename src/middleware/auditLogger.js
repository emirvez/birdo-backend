const db = require('../config/database');

function auditLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user ? req.user.id : null;
    const action = `${req.method} ${req.route ? req.route.path : req.path}`;

    // Structured JSON log for every request
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
      userId,
      ip: req.ip,
    };
    console.log(JSON.stringify(logEntry));

    // Persist auth-sensitive actions to DB for SOC 2 audit trail
    const auditActions = ['POST /auth', 'DELETE /user', 'POST /stripe', 'POST /v1'];
    const shouldLog = auditActions.some(a => action.startsWith(a)) || res.statusCode >= 400;

    if (shouldLog) {
      db.query(
        `INSERT INTO audit_logs (request_id, user_id, action, method, path, status_code, ip, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.id, userId, action, req.method, req.originalUrl, res.statusCode, req.ip, req.headers['user-agent'] || '']
      ).catch(() => {}); // Fire-and-forget, don't block response
    }
  });

  next();
}

module.exports = auditLogger;
