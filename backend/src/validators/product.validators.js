import { z } from 'zod';

export const listProductsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().int().min(0).optional(), // centavos
  maxPrice: z.coerce.number().int().min(0).optional(), // centavos
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const productIdParams = z.object({
  id: z.string().uuid(),
});