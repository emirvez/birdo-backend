const { Pool } = require('pg');
const env = require('./env');

const isRemoteDb = env.databaseUrl && env.databaseUrl.includes('render.com');
const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: isRemoteDb || env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
