import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addItemSchema, updateItemSchema, cartItemParams } from '../validators/cart.validators.js';
import * as cart from '../controllers/cart.controller.js';

const router = Router();

router.use(auth); // every cart route needs a logged-in user

router.get('/', cart.get);
router.delete('/', cart.clear);
router.post('/items', validate(addItemSchema), cart.add);
router.patch(
  '/items/:productId',
  validate(cartItemParams, 'params'),
  validate(updateItemSchema),
  cart.update
);
router.delete('/items/:productId', validate(cartItemParams, 'params'), cart.remove);

export default router;