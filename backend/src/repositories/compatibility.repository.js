import { pool } from '../config/db.js';

// Specs always come from the database, never from the request.
export async function findByIds(ids) {
  const { rows } = await pool.query(
    `select p.id, p.name, c.name as category, p.specs
     from products p join categories c on c.id = p.category_id
     where p.id = any($1::uuid[])`,
    [ids]
  );
  return rows;
}