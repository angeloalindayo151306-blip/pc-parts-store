import { pool } from '../config/db.js';

// Only products a customer could actually buy right now.
export async function listInStockForAi() {
  const { rows } = await pool.query(
    `select p.id, p.name, c.name as category, p.price_centavos, p.stock, p.specs
     from products p join categories c on c.id = p.category_id
     where p.is_active = true and p.stock > 0
     order by c.name, p.price_centavos`
  );
  return rows;
}