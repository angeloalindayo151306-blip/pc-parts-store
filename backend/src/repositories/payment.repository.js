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

export async function findPaymentBySession(db, provider, sessionId) {
  const r = await db.query(
    `SELECT id, order_id, provider, status, amount_centavos, currency
     FROM payments WHERE provider = $1 AND gateway_session_id = $2`,
    [provider, sessionId]
  );
  return r.rows[0] || null;
}

export async function lockPayment(client, paymentId) {
  const r = await client.query(
    `SELECT id, order_id, provider, gateway_session_id, status, amount_centavos, currency
     FROM payments WHERE id = $1 FOR UPDATE`,
    [paymentId]
  );
  return r.rows[0] || null;
}

// Payments that could still change the order (newest 3 only, to limit gateway calls).
export async function openPaymentsForOrder(db, orderId) {
  const r = await db.query(
    `SELECT id, provider, gateway_session_id
     FROM payments
     WHERE order_id = $1 AND status IN ('pending', 'failed', 'expired')
     ORDER BY created_at DESC LIMIT 3`,
    [orderId]
  );
  return r.rows;
}

export async function setFlagReason(client, orderId, reason) {
  await client.query('UPDATE orders SET flag_reason = $1, updated_at = now() WHERE id = $2', [
    reason,
    orderId,
  ]);
}

// Unique (provider, event_key): the same event twice is stored once.
export async function recordWebhookEvent(db, { provider, eventKey, eventType, payload }) {
  const ins = await db.query(
    `INSERT INTO webhook_events (provider, event_key, event_type, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (provider, event_key) DO NOTHING
     RETURNING id`,
    [provider, eventKey, eventType, JSON.stringify(payload)]
  );
  if (ins.rows[0]) return { id: ins.rows[0].id, duplicate: false };
  const ex = await db.query(
    'SELECT id, processed_at FROM webhook_events WHERE provider = $1 AND event_key = $2',
    [provider, eventKey]
  );
  // Seen before but never finished (crash) -> allow another attempt.
  return { id: ex.rows[0].id, duplicate: ex.rows[0].processed_at !== null };
}

export async function markWebhookProcessed(db, id) {
  await db.query('UPDATE webhook_events SET processed_at = now() WHERE id = $1', [id]);
}