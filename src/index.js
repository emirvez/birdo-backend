// Handle unhandled rejections — log and exit to prevent zombie processes
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message || err);
  process.exit(1);
});

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const ipRateLimiter = require('./middleware/ipRateLimiter');
const requestId = require('./middleware/requestId');
const auditLogger = require('./middleware/auditLogger');
const { startTokenCleanup } = require('./jobs/tokenCleanup');
const { startUserCleanup } = require('./jobs/userCleanup');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const userRoutes = require('./routes/user');
const stripeRoutes = require('./routes/stripe');

const app = express();

// Trust proxy (for Render, Railway, etc.)
if (env.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Block requests with no Origin header on protected paths (CORS bypass prevention)
const NO_ORIGIN_PATHS = ['/health', '/stripe/webhook'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin && !NO_ORIGIN_PATHS.includes(req.path)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// CORS — allow Chrome extension origins only
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (health checks, webhooks)
    if (!origin) return cb(null, true);
    if (env.allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Request ID for tracing
app.use(requestId);

// Global IP rate limiter (100 req/min per IP)
app.use(ipRateLimiter);

// Audit logger
app.use(auditLogger);

// Parse JSON (except for Stripe webhooks which need raw body)
app.use((req, res, next) => {
  if (req.path === '/stripe/webhook') return next();
  express.json({ limit: '1mb', type: 'application/json' })(req, res, next);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/v1', apiRoutes);
app.use('/user', userRoutes);
app.use('/stripe', stripeRoutes);

// Error handler
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Birdo API running on port ${env.port} (${env.nodeEnv})`);

  // Start background jobs
  startTokenCleanup();
  startUserCleanup();
});
