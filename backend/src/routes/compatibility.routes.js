import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { validate } from '../middleware/validate.js';
import { checkSchema } from '../validators/compatibility.validators.js';
import * as controller from '../controllers/compatibility.controller.js';

const router = Router();

const checkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test',
  handler: (req, res, next) =>
    next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again later.')),
});

router.post('/check', checkLimiter, validate(checkSchema), controller.check);

export default router;