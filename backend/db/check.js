import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const r = await pool.query(
  "select count(*)::int as tables from pg_tables where schemaname = 'public'"
);
console.log('Connected! Tables found:', r.rows[0].tables);
await pool.end();
