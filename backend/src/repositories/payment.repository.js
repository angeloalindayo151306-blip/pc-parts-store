export async function reservationActive(client, orderId) {
  const r = await client.query(
    `SELECT coalesce(bool_and(expires_at > now()), false) AS active
     FROM stock_reservations WHERE order_id = $1 AND released = false`,
    [orderId]
  );
  return r.rows[0].active;
}

export async function findPendingPayment(client, orderId) {
  const r = await client.query(
    `SELECT id, provider, gateway_session_id, checkout_url
     FROM payments WHERE order_id = $1 AND status = 'pending'`,
    [orderId]
  );
  return r.rows[0] || null;
}

export async function setPaymentStatus(client, paymentId, status) {
  await client.query('UPDATE payments SET status = $1, updated_at = now() WHERE id = $2', [
    status,
    paymentId,
  ]);
}

export async function insertPayment(client, p) {
  const r = await client.query(
    `INSERT INTO payments
       (order_id, provider, gateway_session_id, amount_centavos, currency, status, checkout_url)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)
     RETURNING id`,
    [p.orderId, p.provider, p.sessionId, p.amountCentavos, p.currency, p.checkoutUrl]
  );
  return r.rows[0].id;
}

export async function orderForPayment(client, orderId) {
  const r = await client.query(
    `SELECT id, user_id, subtotal_centavos, discount_centavos, shipping_centavos,
            total_centavos, shipping_address
     FROM orders WHERE id = $1`,
    [orderId]
  );
  return r.rows[0] || null;
}

export async function itemsForPayment(client, orderId) {
  const r = await client.query(
    `SELECT product_id, product_name, quantity, unit_price_centavos
     FROM order_items WHERE order_id = $1 ORDER BY product_name`,
    [orderId]
  );
  return r.rows;
}

export async function userEmail(client, userId) {
  const r = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.email ?? null;
}