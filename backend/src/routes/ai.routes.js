import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { validate } from '../middleware/validate.js';
import { recommendBuildSchema } from '../validators/ai.validators.js';
import * as controller from '../controllers/ai.controller.js';

const router = Router();

// Each request can call a paid AI API, so keep it tight.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test',
  handler: (req, res, next) =>
    next(new AppError(429, 'RATE_LIMITED', 'Too many AI requests. Try again later.')),
});

router.post('/recommend-build', aiLimiter, validate(recommendBuildSchema), controller.recommendBuild);

export default router;