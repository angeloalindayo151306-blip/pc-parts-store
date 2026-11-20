import { readFileSync } from 'node:fs';
import { pool } from '../src/config/db.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.js db/migrations/<file>.sql');
  process.exit(1);
}
const sql = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
await pool.query(sql);
console.log(`Applied ${file}`);
await pool.end();