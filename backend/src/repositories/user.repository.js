import { pool } from '../config/db.js';

export async function findByEmail(email) {
  const { rows } = await pool.query('select * from users where email = $1', [email]);
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await pool.query(
    'select id, name, email, role from users where id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function create({ name, email, passwordHash }) {
  const { rows } = await pool.query(
    `insert into users (name, email, password_hash)
     values ($1, $2, $3)
     returning id, name, email, role`,
    [name, email, passwordHash]
  );
  return rows[0];
}