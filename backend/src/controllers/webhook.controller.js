import { createHash, timingSafeEqual } from 'node:crypto';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { getPaymentProvider } from '../services/payments/paymentFactory.js';
import { settlePayment } from '../services/paymentSettlement.service.js';
import * as repo from '../repositories/payment.repository.js';

const digest = (s) => createHash('sha256').update(String(s)).digest();

// Hash both sides so the buffers have equal length, then compare in constant time.
function tokenMatches(given) {
  const expected = env.payment.webhookToken;
  if (!expected) return false; // no token configured = webhook closed
  return timingSafeEqual(digest(given), digest(expected));
}

export const receive = asyncHandler(async (req, res) => {
  if (!tokenMatches(req.params.token)) {
    throw new AppError(401, 'WEBHOOK_UNAUTHORIZED', 'Invalid webhook token');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '');
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'Webhook body must be JSON');
  }

  const provider = getPaymentProvider();
  const event = provider.verifyWebhook(payload);
  if (!event) return ok(res, { received: true, ignored: true }); // unknown event: 2xx, no action

  const { id, duplicate } = await repo.recordWebhookEvent(pool, {
    provider: provider.name,
    eventKey: event.eventKey,
    eventType: event.eventType,
    payload,
  });

  ok(res, { received: true, duplicate }); // answer fast; the gateway is not kept waiting

  if (duplicate) return;
  setImmediate(() => {
    settlePayment({ providerName: provider.name, sessionId: event.sessionId, source: 'webhook' })
      .then(() => repo.markWebhookProcessed(pool, id))
      .catch((err) => console.error('Webhook processing failed', id, err.code || err.message));
  });
});