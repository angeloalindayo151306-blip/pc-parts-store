import { AppError } from '../utils/errors.js';
import { insertHistory } from '../repositories/order.repository.js';

// from-status -> statuses it may move to. Anything not listed is illegal.
const TRANSITIONS = {
  pending_payment: ['paid', 'cancelled', 'expired', 'payment_flagged'],
  payment_flagged: ['paid', 'cancelled'],
  paid: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  cancelled: [],
  expired: [],
  delivered: [],
};

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new AppError(409, 'ILLEGAL_TRANSITION', `An order cannot change from ${from} to ${to}`, {
      from,
      to,
    });
  }
}

// Locks the order row until the transaction ends, so two actions on the same
// order (cancel + webhook, for example) are handled one after the other.
export async function lockOrder(client, orderId, userId = null) {
  const r = userId
    ? await client.query(
        'SELECT id, user_id, status FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [orderId, userId]
      )
    : await client.query('SELECT id, user_id, status FROM orders WHERE id = $1 FOR UPDATE', [
        orderId,
      ]);
  return r.rows[0] || null;
}

// Changes the status and writes the history row (who did it, and why).
// actorId = null means the system did it.
export async function transition(client, order, to, { actorId = null, note = null } = {}) {
  assertTransition(order.status, to);
  await client.query('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', [
    to,
    order.id,
  ]);
  await insertHistory(client, {
    orderId: order.id,
    from: order.status,
    to,
    actorId,
    note,
  });
}

// Gives reserved stock back and frees the coupon. Safe to call twice:
// reservations already released are skipped.
export async function releaseHold(client, orderId) {
  // A cancelled or expired order must not keep a live payment session.
  await client.query(
    `UPDATE payments SET status = 'expired', updated_at = now()
     WHERE order_id = $1 AND status = 'pending'`,
    [orderId]
  );

  await client.query(
    `WITH rel AS (
       UPDATE stock_reservations SET released = true
       WHERE order_id = $1 AND released = false
       RETURNING product_id, quantity
     )
     UPDATE products p SET stock = p.stock + r.qty
     FROM (SELECT product_id, sum(quantity)::int AS qty FROM rel GROUP BY product_id) r
     WHERE p.id = r.product_id`,
    [orderId]
  );

  const red = await client.query(
    'DELETE FROM coupon_redemptions WHERE order_id = $1 RETURNING coupon_id',
    [orderId]
  );
  for (const row of red.rows) {
    await client.query('UPDATE coupons SET times_used = GREATEST(times_used - 1, 0) WHERE id = $1', [
      row.coupon_id,
    ]);
  }
}