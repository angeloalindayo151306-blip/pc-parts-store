import { pool } from '../config/db.js';

export async function checkDatabase() {
  await pool.query('select 1');
}