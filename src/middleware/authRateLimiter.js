// Strict rate limiter for auth endpoints — 10 attempts per 15 minutes per IP
const windows = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (now - entry.start > WINDOW_MS * 2) windows.delete(key);
  }
}, 5 * 60 * 1000);

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  let entry = windows.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    windows.set(ip, entry);
  }

  entry.count++;

  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  next();
}

module.exports = authRateLimiter;
