import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { getPaymentProvider } from '../services/payments/paymentFactory.js';

const router = Router();

const sessionParams = z.object({ sessionId: z.string().regex(/^mock_[0-9a-f-]{36}$/) });
const outcomeBody = z.object({ outcome: z.enum(['paid', 'failed', 'cancelled']) }).strict();

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
    getPaymentProvider('mock').simulate(req.params.sessionId, req.body.outcome);
    ok(res, { sessionId: req.params.sessionId, status: req.body.outcome });
  })
);

export default router;