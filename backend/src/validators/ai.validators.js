import { z } from 'zod';

export const recommendBuildSchema = z.object({
  budgetPhp: z.number().int().min(1000).max(1000000),
  useCase: z.enum(['gaming', 'editing', 'office']),
  notes: z.string().max(1000).optional(),
});