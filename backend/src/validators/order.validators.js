import { z } from 'zod';

const text = (min, max) => z.string().trim().min(min).max(max);

export const shippingAddressSchema = z
  .object({
    fullName: text(2, 100),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s]{7,20}$/, 'Enter a valid phone number'),
    line1: text(3, 150),
    line2: z.string().trim().max(150).optional(),
    city: text(2, 80),
    province: text(2, 80),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{4}$/, 'Postal code must be 4 digits'),
  })
  .strict();

export const createOrderSchema = z
  .object({
    shippingAddress: shippingAddressSchema,
    couponCode: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

export const orderIdParams = z.object({ id: z.string().uuid() });