import { pool } from '../src/config/db.js';

const cols = await pool.query(
  `SELECT table_name, column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = ANY($1)
   ORDER BY table_name, ordinal_position`,
  [['payments', 'webhook_events']],
);
console.table(cols.rows);

const cons = await pool.query(
  `SELECT conrelid::regclass AS tbl, pg_get_constraintdef(oid) AS def
   FROM pg_constraint
   WHERE conrelid IN ('payments'::regclass, 'webhook_events'::regclass)`,
);
console.table(cons.rows);

await pool.end();