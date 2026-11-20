import { pool } from '../config/db.js';

const COLS = `p.id, p.category_id, c.name AS category_name, p.name, p.description,
  p.price_centavos, p.stock, p.image_url, p.is_active, p.specs, p.created_at`;

const FIELD_TO_COLUMN = {
  categoryId: 'category_id',
  name: 'name',
  description: 'description',
  priceCentavos: 'price_centavos',
  imageUrl: 'image_url',
  specs: 'specs',
  isActive: 'is_active',
};

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

export async function listAll({ q, status, page, limit }) {
  const where = [];
  const params = [];
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    where.push(`p.name ILIKE $${params.length}`);
  }
  if (status === 'active') where.push('p.is_active = true');
  if (status === 'inactive') where.push('p.is_active = false');
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const countRes = await pool.query(
    `SELECT count(*)::int AS total FROM products p ${whereSql}`,
    params
  );

  const listParams = [...params, limit, (page - 1) * limit];
  const itemsRes = await pool.query(
    `SELECT ${COLS}
     FROM products p JOIN categories c ON c.id = p.category_id
     ${whereSql}
     ORDER BY p.created_at DESC, p.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    listParams
  );
  return { items: itemsRes.rows, total: countRes.rows[0].total };
}

export async function findById(db, id) {
  const r = await db.query(
    `SELECT ${COLS}
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

export async function insert(client, d) {
  const r = await client.query(
    `INSERT INTO products (category_id, name, description, price_centavos, stock, image_url, specs)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id`,
    [
      d.categoryId,
      d.name,
      d.description ?? '',
      d.priceCentavos,
      d.stock ?? 0,
      d.imageUrl ?? null,
      JSON.stringify(d.specs ?? {}),
    ]
  );
  return r.rows[0].id;
}

export async function update(client, id, patch) {
  const sets = [];
  const params = [];
  for (const [key, col] of Object.entries(FIELD_TO_COLUMN)) {
    if (patch[key] === undefined) continue;
    const isSpecs = key === 'specs';
    params.push(isSpecs ? JSON.stringify(patch[key]) : patch[key]);
    sets.push(`${col} = $${params.length}${isSpecs ? '::jsonb' : ''}`);
  }
  if (sets.length === 0) return true;
  params.push(id);
  const r = await client.query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
    params
  );
  return r.rowCount > 0;
}

// Locks the row until the transaction ends, so two admins can't clash.
export async function lockStock(client, id) {
  const r = await client.query('SELECT id, stock FROM products WHERE id = $1 FOR UPDATE', [id]);
  return r.rows[0] || null;
}

export async function setStock(client, id, newStock) {
  await client.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, id]);
}

export async function insertAdjustment(client, { productId, previousStock, newStock, reason, actorId }) {
  await client.query(
    `INSERT INTO stock_adjustments (product_id, previous_stock, new_stock, reason, actor_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [productId, previousStock, newStock, reason, actorId]
  );
}

export async function listAdjustments(productId) {
  const r = await pool.query(
    `SELECT a.previous_stock, a.new_stock, a.reason, a.actor_id,
            u.email AS actor_email, a.created_at
     FROM stock_adjustments a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.product_id = $1
     ORDER BY a.created_at DESC
     LIMIT 100`,
    [productId]
  );
  return r.rows;
}