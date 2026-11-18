import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();

// Slows down password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test',
  handler: (req, res, next) =>
    next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.')),
});

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);

export default router;