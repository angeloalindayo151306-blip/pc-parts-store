// Prints the public schema in a compact form (tables, columns, constraints, indexes).
// Read-only. Run from backend/:  node --env-file=.env scripts/dump-schema.js
import { pool } from '../src/config/db.js';

const cols = await pool.query(`
  SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position`);

const cons = await pool.query(`
  SELECT conrelid::regclass::text AS tbl, contype, conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace
  ORDER BY 1, 2, 3`);

const idx = await pool.query(`
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname NOT IN (SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace)
  ORDER BY 1, 2`);

const byTable = new Map();
for (const c of cols.rows) {
  const type = ['USER-DEFINED', 'ARRAY'].includes(c.data_type) ? c.udt_name : c.data_type;
  let s = `${c.column_name} ${type}`;
  if (c.is_nullable === 'YES') s += ' NULL';
  if (c.column_default) s += ` DEFAULT ${String(c.column_default).slice(0, 40)}`;
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, []);
  byTable.get(c.table_name).push(s);
}

const kind = { p: 'PK', f: 'FK', u: 'UNIQUE', c: 'CHECK' };
console.log(`TABLES ${byTable.size}`);
for (const [t, list] of byTable) console.log(`T ${t}: ${list.join(' | ')}`);
for (const c of cons.rows) console.log(`${kind[c.contype] || c.contype} ${c.tbl}: ${c.def}`);
for (const i of idx.rows) console.log(`IDX ${i.tablename}: ${i.indexdef.replace(/^CREATE (UNIQUE )?INDEX \S+ ON public\./, (m, u) => (u ? 'UNIQUE ' : '')).slice(0, 160)}`);

await pool.end();