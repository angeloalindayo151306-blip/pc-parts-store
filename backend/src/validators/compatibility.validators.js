import { z } from 'zod';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const checkSchema = z.object({
  productIds: z.array(z.string().regex(UUID, 'Invalid product id')).min(1).max(12),
});