// Simple in-memory IP rate limiter — 100 requests/min per IP
const windows = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (now - entry.start > WINDOW_MS * 2) windows.delete(key);
  }
}, 5 * 60 * 1000);

function ipRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  let entry = windows.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    windows.set(ip, entry);
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  next();
}

module.exports = ipRateLimiter;
