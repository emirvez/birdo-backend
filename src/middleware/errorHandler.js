function errorHandler(err, req, res, _next) {
  // Log error type without leaking internals
  console.error('Error:', err.status || 500, err.message);

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
