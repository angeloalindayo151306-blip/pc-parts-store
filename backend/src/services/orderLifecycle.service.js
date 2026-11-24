import { pool } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { withTransaction } from '../utils/transaction.js';
import { RESERVATION_MINUTES } from '../config/business.js';
import * as repo from '../repositories/order.repository.js';
import { lockOrder, transition, releaseHold, reservationState } from './orderWorkflow.js';

// Customer cancels their own unpaid order.
export async function cancelOrder(userId, orderId) {
  await withTransaction(async (client) => {
    const order = await lockOrder(client, orderId, userId);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    await transition(client, order, 'cancelled', {
      actorId: userId,
      note: 'Cancelled by customer',
    });
    await releaseHold(client, orderId);
  });
  return repo.findOrder(pool, orderId, userId);
}

// Expires unpaid orders. Returns how many it expired. Two kinds are handled:
//   1. the stock hold ran out (the normal case)
//   2. the hold was given back after a failed payment and the customer never retried
// Each order is handled in its own transaction and re-checked after locking,
// so it never touches an order that was paid, cancelled or retried a moment ago.
export async function expireStaleOrders() {
  const lapsed = await pool.query(
    `SELECT DISTINCT o.id
     FROM orders o JOIN stock_reservations sr ON sr.order_id = o.id
     WHERE o.status = 'pending_payment' AND sr.released = false AND sr.expires_at <= now()
     LIMIT 100`
  );

  const abandoned = await pool.query(
    `SELECT o.id
     FROM orders o
     WHERE o.status = 'pending_payment'
       AND o.updated_at <= now() - make_interval(mins => $1::int)
       AND NOT EXISTS (
         SELECT 1 FROM stock_reservations sr WHERE sr.order_id = o.id AND sr.released = false
       )
       AND NOT EXISTS (
         SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'pending'
       )
     LIMIT 100`,
    [RESERVATION_MINUTES]
  );

  const ids = [...new Set([...lapsed.rows, ...abandoned.rows].map((r) => r.id))];

  let expired = 0;
  for (const id of ids) {
    try {
      const done = await withTransaction(async (client) => {
        const order = await lockOrder(client, id);
        if (!order || order.status !== 'pending_payment') return false;

        // Re-check under the lock: a retry may have taken a fresh hold in the meantime.
        const hold = await reservationState(client, id);
        if (hold === 'active') return false;

        await transition(client, order, 'expired', {
          actorId: null,
          note: hold === 'none' ? 'Payment failed and was not retried' : 'Payment window ended',
        });
        await releaseHold(client, id);
        return true;
      });
      if (done) expired += 1;
    } catch (err) {
      console.error('Could not expire order', id, err.code || err.message);
    }
  }
  return expired;
}