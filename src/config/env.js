require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  groqApiKey: process.env.GROQ_API_KEY,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    proPriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  appUrl: process.env.APP_URL || 'https://birdo.io',
};

// Validate required secrets are present in production
if (env.nodeEnv === 'production') {
  const required = ['databaseUrl', 'jwtAccessSecret', 'jwtRefreshSecret', 'groqApiKey', 'googleClientId'];
  for (const key of required) {
    if (!env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }
  if (env.allowedOrigins.length === 0) {
    console.error('ALLOWED_ORIGINS must be set in production');
    process.exit(1);
  }
}

module.exports = env;
