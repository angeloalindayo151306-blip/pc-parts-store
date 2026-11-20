import { z } from 'zod';

const quantity = z.number().int().min(1).max(99);

export const addItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: quantity.default(1),
  })
  .strict();

export const updateItemSchema = z.object({ quantity }).strict();

export const cartItemParams = z.object({ productId: z.string().uuid() });