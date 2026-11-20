import { AppError } from '../utils/errors.js';
import { calcDiscount } from './pricing.js';

const fail = (code, message, details) => new AppError(422, code, message, details);

// Locks the coupon row, so two checkouts can't both take the last use.
export async function lockAndValidate(client, { code, userId, subtotal }) {
  const r = await client.query('SELECT * FROM coupons WHERE code = $1 FOR UPDATE', [
    code.trim().toUpperCase(),
  ]);
  const coupon = r.rows[0];

  if (!coupon) throw fail('COUPON_INVALID', 'That coupon code does not exist');
  if (!coupon.is_active) throw fail('COUPON_INACTIVE', 'This coupon is not active');
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    throw fail('COUPON_EXPIRED', 'This coupon has expired');
  }
  if (subtotal < coupon.min_spend_centavos) {
    throw fail('COUPON_MIN_SPEND', 'Your order does not reach the minimum spend for this coupon', {
      min_spend_centavos: coupon.min_spend_centavos,
      subtotal_centavos: subtotal,
    });
  }
  if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit) {
    throw fail('COUPON_LIMIT_REACHED', 'This coupon has reached its usage limit');
  }
  const used = await client.query(
    'SELECT count(*)::int AS n FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
    [coupon.id, userId]
  );
  if (used.rows[0].n >= coupon.per_user_limit) {
    throw fail('COUPON_ALREADY_USED', 'You have already used this coupon');
  }

  return { coupon, discount: calcDiscount(coupon, subtotal) };
}