import { z } from 'zod';

const specValue = z.union([z.string().max(200), z.number(), z.boolean()]);

const imageUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'Must start with http:// or https://');

const categoryId = z.number().int().positive();
const name = z.string().trim().min(2).max(150);
const description = z.string().trim().max(2000);
const priceCentavos = z.number().int().min(0).max(100_000_000);
const specs = z.record(z.string().max(50), specValue);

export const createProductSchema = z
  .object({
    categoryId,
    name,
    description: description.optional(),
    priceCentavos,
    stock: z.number().int().min(0).max(100000).default(0),
    imageUrl: imageUrl.nullable().optional(),
    specs: specs.optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    categoryId: categoryId.optional(),
    name: name.optional(),
    description: description.optional(),
    priceCentavos: priceCentavos.optional(),
    imageUrl: imageUrl.nullable().optional(),
    specs: specs.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const stockAdjustSchema = z
  .object({
    newStock: z.number().int().min(0).max(100000),
    reason: z.string().trim().min(3).max(200),
  })
  .strict();

export const adminListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});