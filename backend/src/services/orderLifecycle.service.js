import { pool } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { withTransaction } from '../utils/transaction.js';
import * as repo from '../repositories/order.repository.js';
import { lockOrder, transition, releaseHold } from './orderWorkflow.js';

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

// Expires unpaid orders whose stock hold has run out. Returns how many it expired.
// Each order is handled in its own transaction and re-checked after locking,
// so it never touches an order that was paid or cancelled a moment ago.
export async function expireStaleOrders() {
  const due = await pool.query(
    `SELECT DISTINCT o.id
     FROM orders o JOIN stock_reservations sr ON sr.order_id = o.id
     WHERE o.status = 'pending_payment' AND sr.released = false AND sr.expires_at <= now()
     LIMIT 100`
  );
  let expired = 0;
  for (const { id } of due.rows) {
    try {
      const done = await withTransaction(async (client) => {
        const order = await lockOrder(client, id);
        if (!order || order.status !== 'pending_payment') return false;
        await transition(client, order, 'expired', {
          actorId: null,
          note: 'Payment window ended',
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