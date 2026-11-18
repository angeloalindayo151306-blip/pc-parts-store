import pg from 'pg';
import { env } from './env.js';

// Singleton: Node caches this module, so the whole app shares one pool.
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});