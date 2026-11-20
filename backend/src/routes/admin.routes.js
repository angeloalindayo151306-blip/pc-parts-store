import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../utils/response.js';
import { productIdParams } from '../validators/product.validators.js';
import {
  createProductSchema,
  updateProductSchema,
  stockAdjustSchema,
  adminListQuery,
} from '../validators/admin.validators.js';
import * as products from '../controllers/admin.product.controller.js';

const router = Router();

// Everything below requires a valid token AND the admin role.
router.use(auth, requireRole('admin'));

router.get('/ping', (req, res) => ok(res, { pong: true, role: req.user.role }));

router.get('/products', validate(adminListQuery, 'query'), products.list);
router.post('/products', validate(createProductSchema), products.create);
router.get('/products/:id', validate(productIdParams, 'params'), products.getOne);
router.patch(
  '/products/:id',
  validate(productIdParams, 'params'),
  validate(updateProductSchema),
  products.update
);
router.delete('/products/:id', validate(productIdParams, 'params'), products.remove);
router.post(
  '/products/:id/stock',
  validate(productIdParams, 'params'),
  validate(stockAdjustSchema),
  products.adjustStock
);
router.get(
  '/products/:id/adjustments',
  validate(productIdParams, 'params'),
  products.adjustments
);

export default router;