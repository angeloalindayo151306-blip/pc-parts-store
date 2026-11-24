import { AppError } from '../utils/errors.js';
import {
  insertHistory,
  reserveStock,
  insertReservation,
  productState,
} from '../repositories/order.repository.js';

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

// Gives reserved stock back. Safe to call twice: reservations already released are skipped.
// The order stays as it is (used when a payment attempt fails and the customer may retry).
export async function releaseStock(client, orderId) {
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
  await client.query('UPDATE orders SET updated_at = now() WHERE id = $1', [orderId]);
}

// Gives reserved stock back and frees the coupon. Safe to call twice.
export async function releaseHold(client, orderId) {
  // A cancelled or expired order must not keep a live payment session.
  await client.query(
    `UPDATE payments SET status = 'expired', updated_at = now()
     WHERE order_id = $1 AND status = 'pending'`,
    [orderId]
  );
  await releaseStock(client, orderId);
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

// 'none'   = no live hold rows (released after a failed payment): a new hold can be taken
// 'active' = every hold row is still inside its window
// 'lapsed' = a hold ran out but the expiry job has not processed it yet
export async function reservationState(client, orderId) {
  const r = await client.query(
    `SELECT count(*)::int AS total,
            (count(*) FILTER (WHERE expires_at > now()))::int AS live
     FROM stock_reservations WHERE order_id = $1 AND released = false`,
    [orderId]
  );
  const { total, live } = r.rows[0];
  if (total === 0) return 'none';
  return live === total ? 'active' : 'lapsed';
}

// Takes a fresh hold for every item of the order, all or nothing.
// A savepoint undoes the items already taken if a later one is out of stock.
export async function reserveOrderStock(client, orderId) {
  const items = await client.query(
    'SELECT product_id, quantity FROM order_items WHERE order_id = $1 ORDER BY product_id',
    [orderId]
  );
  await client.query('SAVEPOINT reserve_order_stock');
  for (const it of items.rows) {
    const taken = await reserveStock(client, it.product_id, it.quantity);
    if (!taken) {
      await client.query('ROLLBACK TO SAVEPOINT reserve_order_stock');
      const state = await productState(client, it.product_id);
      return { ok: false, productName: state?.name || 'An item' };
    }
    await insertReservation(client, orderId, {
      productId: it.product_id,
      quantity: it.quantity,
    });
  }
  await client.query('RELEASE SAVEPOINT reserve_order_stock');
  return { ok: true };
}