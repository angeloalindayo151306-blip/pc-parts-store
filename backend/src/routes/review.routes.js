import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reviewParams, listReviewsQuery, reviewBody } from '../validators/review.validators.js';
import * as controller from '../controllers/review.controller.js';

// Mounted at /products/:id/reviews, so the product id comes from the parent path.
const router = Router({ mergeParams: true });

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test',
  handler: (req, res, next) =>
    next(new AppError(429, 'RATE_LIMITED', 'Too many review requests. Try again later.')),
});

router.get('/', validate(reviewParams, 'params'), validate(listReviewsQuery, 'query'), controller.list);
router.post('/', writeLimiter, auth, validate(reviewParams, 'params'), validate(reviewBody), controller.create);
router.put('/mine', writeLimiter, auth, validate(reviewParams, 'params'), validate(reviewBody), controller.update);
router.delete('/mine', writeLimiter, auth, validate(reviewParams, 'params'), controller.remove);

export default router;