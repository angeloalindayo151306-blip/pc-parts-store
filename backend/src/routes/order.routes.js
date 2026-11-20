import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, orderIdParams } from '../validators/order.validators.js';
import * as orders from '../controllers/order.controller.js';

const router = Router();

router.use(auth);

router.post('/', validate(createOrderSchema), orders.create);
router.get('/', orders.list);
router.get('/:id', validate(orderIdParams, 'params'), orders.getOne);

export default router;