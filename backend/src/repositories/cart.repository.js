export async function findCartId(db, userId) {
  const r = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
  return r.rows[0]?.id ?? null;
}

// The upsert also locks the cart row until the transaction ends,
// so two requests from the same user are handled one after the other.
export async function getOrCreateCartId(client, userId) {
  const r = await client.query(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [userId]
  );
  return r.rows[0].id;
}

export async function listItems(db, cartId) {
  const r = await db.query(
    `SELECT ci.product_id, ci.quantity,
            p.name, p.price_centavos, p.stock, p.is_active, p.image_url,
            c.name AS category_name
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE ci.cart_id = $1
     ORDER BY p.name, ci.product_id`,
    [cartId]
  );
  return r.rows;
}

export async function findProduct(db, productId) {
  const r = await db.query('SELECT id, name, stock, is_active FROM products WHERE id = $1', [
    productId,
  ]);
  return r.rows[0] || null;
}

export async function getQuantity(db, cartId, productId) {
  const r = await db.query(
    'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
    [cartId, productId]
  );
  return r.rows[0]?.quantity ?? null;
}

export async function setQuantity(client, cartId, productId, quantity) {
  await client.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [cartId, productId, quantity]
  );
}

export async function removeItem(client, cartId, productId) {
  const r = await client.query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [
    cartId,
    productId,
  ]);
  return r.rowCount > 0;
}

export async function clear(client, cartId) {
  await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
}