import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { listProductsQuery, productIdParams } from '../validators/product.validators.js';
import * as controller from '../controllers/product.controller.js';

const router = Router();

router.get('/', validate(listProductsQuery, 'query'), controller.list);
router.get('/:id', validate(productIdParams, 'params'), controller.getOne);

export default router;