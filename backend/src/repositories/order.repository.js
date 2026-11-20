import { RESERVATION_MINUTES } from '../config/business.js';

// One checkout at a time per user (released automatically at COMMIT/ROLLBACK).
export async function lockUser(client, userId) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`checkout:${userId}`]);
}

export async function findByIdempotencyKey(client, userId, key) {
  const r = await client.query(
    'SELECT id FROM orders WHERE user_id = $1 AND idempotency_key = $2',
    [userId, key]
  );
  return r.rows[0]?.id ?? null;
}

// Locking the cart row makes a simultaneous "add to cart" wait until checkout ends.
export async function cartLines(client, userId) {
  const c = await client.query('SELECT id FROM carts WHERE user_id = $1 FOR UPDATE', [userId]);
  if (!c.rows[0]) return [];
  const r = await client.query(
    'SELECT product_id, quantity FROM cart_items WHERE cart_id = $1 ORDER BY product_id',
    [c.rows[0].id]
  );
  return r.rows;
}

// The whole stock check is one atomic UPDATE: zero rows means it could not be reserved.
// The price returned is the one used for the order, so it can't change mid-checkout.
export async function reserveStock(client, productId, quantity) {
  const r = await client.query(
    `UPDATE products SET stock = stock - $1
     WHERE id = $2 AND stock >= $1 AND is_active = true
     RETURNING name, price_centavos`,
    [quantity, productId]
  );
  return r.rows[0] || null;
}

export async function productState(client, productId) {
  const r = await client.query('SELECT name, stock, is_active FROM products WHERE id = $1', [
    productId,
  ]);
  return r.rows[0] || null;
}

export async function insertOrder(client, o) {
  const r = await client.query(
    `INSERT INTO orders
       (user_id, status, subtotal_centavos, discount_centavos, shipping_centavos,
        total_centavos, coupon_id, idempotency_key, shipping_address)
     VALUES ($1, 'pending_payment', $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id`,
    [
      o.userId,
      o.subtotal,
      o.discount,
      o.shipping,
      o.total,
      o.couponId,
      o.idempotencyKey,
      JSON.stringify(o.shippingAddress),
    ]
  );
  return r.rows[0].id;
}

export async function insertItem(client, orderId, item) {
  await client.query(
    `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_centavos)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderId, item.productId, item.name, item.quantity, item.unitPrice]
  );
}

export async function insertReservation(client, orderId, item) {
  await client.query(
    `INSERT INTO stock_reservations (order_id, product_id, quantity, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(mins => $4::int))`,
    [orderId, item.productId, item.quantity, RESERVATION_MINUTES]
  );
}

export async function insertHistory(client, { orderId, from, to, actorId, note }) {
  await client.query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, actor_id, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderId, from, to, actorId, note]
  );
}

export async function insertRedemption(client, { couponId, userId, orderId }) {
  await client.query(
    'INSERT INTO coupon_redemptions (coupon_id, user_id, order_id) VALUES ($1, $2, $3)',
    [couponId, userId, orderId]
  );
  await client.query('UPDATE coupons SET times_used = times_used + 1 WHERE id = $1', [couponId]);
}

export async function clearCart(client, userId) {
  await client.query(
    'DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)',
    [userId]
  );
}

export async function findOrder(db, orderId, userId) {
  const o = await db.query(
    `SELECT o.id, o.status, o.subtotal_centavos, o.discount_centavos, o.shipping_centavos,
            o.total_centavos, o.shipping_address, o.flag_reason, o.created_at, o.updated_at,
            c.code AS coupon_code,
            (SELECT min(sr.expires_at) FROM stock_reservations sr
              WHERE sr.order_id = o.id AND sr.released = false) AS reservation_expires_at
     FROM orders o LEFT JOIN coupons c ON c.id = o.coupon_id
     WHERE o.id = $1 AND o.user_id = $2`,
    [orderId, userId]
  );
  const order = o.rows[0];
  if (!order) return null;

  const items = await db.query(
    `SELECT product_id, product_name, quantity, unit_price_centavos,
            quantity * unit_price_centavos AS line_total_centavos
     FROM order_items WHERE order_id = $1 ORDER BY product_name`,
    [orderId]
  );
  const history = await db.query(
    `SELECT from_status, to_status, note, created_at
     FROM order_status_history WHERE order_id = $1 ORDER BY created_at, id`,
    [orderId]
  );
  return { ...order, items: items.rows, history: history.rows };
}

export async function listForUser(db, userId) {
  const r = await db.query(
    `SELECT o.id, o.status, o.total_centavos, o.created_at,
            (SELECT coalesce(sum(oi.quantity), 0)::int FROM order_items oi
              WHERE oi.order_id = o.id) AS item_count
     FROM orders o WHERE o.user_id = $1
     ORDER BY o.created_at DESC LIMIT 50`,
    [userId]
  );
  return r.rows;
}