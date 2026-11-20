import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { getPaymentProvider } from '../services/payments/paymentFactory.js';

const router = Router();

const sessionParams = z.object({ sessionId: z.string().regex(/^mock_[0-9a-f-]{36}$/) });
const outcomeBody = z
  .object({
    outcome: z.enum(['paid', 'failed', 'cancelled', 'expired']),
    amountCentavos: z.number().int().min(0).optional(), // test only: simulate a wrong amount
  })
  .strict();

router.get(
  '/:sessionId',
  validate(sessionParams, 'params'),
  asyncHandler(async (req, res) => {
    ok(res, await getPaymentProvider('mock').retrievePayment(req.params.sessionId));
  })
);

router.post(
  '/:sessionId/complete',
  validate(sessionParams, 'params'),
  validate(outcomeBody),
  asyncHandler(async (req, res) => {
    const { outcome, amountCentavos } = req.body;
    const overrides = amountCentavos === undefined ? {} : { amountCentavos };
    getPaymentProvider('mock').simulate(req.params.sessionId, outcome, overrides);
    ok(res, { sessionId: req.params.sessionId, status: outcome });
  })
);

export default router;