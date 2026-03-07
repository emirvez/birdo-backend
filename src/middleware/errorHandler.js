function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  // Structured error log with request ID for tracing
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId: req.id,
    status,
    error: err.message,
    path: req.originalUrl,
    method: req.method,
  }));

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
