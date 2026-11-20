import { pool } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { withTransaction } from '../utils/transaction.js';
import { lockOrder, transition, releaseHold } from './orderWorkflow.js';
import { getPaymentProvider } from './payments/paymentFactory.js';
import * as repo from '../repositories/payment.repository.js';
import * as orderRepo from '../repositories/order.repository.js';

/**
 * The single place where a gateway result changes an order.
 * Used by the webhook AND by reconcile, so both behave identically.
 * Safe to call any number of times for the same session.
 */
export async function settlePayment({ providerName, sessionId, source }) {
  const known = await repo.findPaymentBySession(pool, providerName, sessionId);
  if (!known) return { result: 'unknown_session' };

  // Server-to-server check. The webhook body and the browser are never trusted.
  const info = await getPaymentProvider(providerName).retrievePayment(sessionId);

  return withTransaction(async (client) => {
    // Lock order first, then payment (same order everywhere, so no deadlocks).
    const order = await lockOrder(client, known.order_id);
    const payment = await repo.lockPayment(client, known.id);
    if (!order || !payment) return { result: 'unknown_session' };

    if (payment.status === 'paid' || payment.status === 'flagged') {
      return { result: 'already_processed', orderStatus: order.status };
    }
    if (info.status === 'pending') {
      return { result: 'still_pending', orderStatus: order.status };
    }

    if (info.status === 'paid') {
      const problems = [];
      if (info.amountCentavos !== payment.amount_centavos) {
        problems.push(`amount ${info.amountCentavos} does not match expected ${payment.amount_centavos}`);
      }
      if (info.currency !== payment.currency) {
        problems.push(`currency ${info.currency} does not match expected ${payment.currency}`);
      }
      if (info.reference && info.reference !== order.id) {
        problems.push('payment reference does not match this order');
      }
      if (order.status !== 'pending_payment' && order.status !== 'payment_flagged') {
        problems.push(`money arrived but the order was already ${order.status}`);
      }

      if (problems.length > 0) {
        // Flag for a human. Never mark paid when anything looks wrong.
        const reason = `Payment ${sessionId}: ${problems.join('; ')}`;
        await repo.setPaymentStatus(client, payment.id, 'flagged');
        await repo.setFlagReason(client, order.id, reason);
        let orderStatus = order.status;
        if (order.status === 'pending_payment') {
          await transition(client, order, 'payment_flagged', { actorId: null, note: reason });
          orderStatus = 'payment_flagged';
        }
        return { result: 'flagged', orderStatus };
      }

      await repo.setPaymentStatus(client, payment.id, 'paid');
      await transition(client, order, 'paid', {
        actorId: null,
        note: `Payment confirmed by ${payment.provider} (${source})`,
      });
      return { result: 'paid', orderStatus: 'paid' };
    }

    // failed / cancelled / expired
    if (payment.status !== 'pending') return { result: 'already_closed', orderStatus: order.status };

    if (info.status === 'expired') {
      await repo.setPaymentStatus(client, payment.id, 'expired');
      let orderStatus = order.status;
      if (order.status === 'pending_payment') {
        await transition(client, order, 'expired', {
          actorId: null,
          note: 'Payment session expired at the gateway',
        });
        await releaseHold(client, order.id);
        orderStatus = 'expired';
      }
      return { result: 'expired', orderStatus };
    }

    // failed or cancelled: the payment attempt is over, the order stays open for a retry.
    // (The payments table has no 'cancelled' value, so both are stored as 'failed'.)
    await repo.setPaymentStatus(client, payment.id, 'failed');
    return { result: info.status, orderStatus: order.status };
  });
}

// Customer-triggered check for a missed webhook. Also used by /payment/success.
export async function reconcileOrder(userId, orderId) {
  const before = await orderRepo.findOrder(pool, orderId, userId);
  if (!before) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

  const open = await repo.openPaymentsForOrder(pool, orderId);
  const results = [];
  for (const p of open) {
    const r = await settlePayment({
      providerName: p.provider,
      sessionId: p.gateway_session_id,
      source: 'reconcile',
    });
    results.push(r.result);
  }
  const order = await orderRepo.findOrder(pool, orderId, userId);
  return { order, checked: open.length, results };
}