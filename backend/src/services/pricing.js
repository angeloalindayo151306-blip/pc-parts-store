import {
  SHIPPING_FLAT_CENTAVOS,
  FREE_SHIPPING_THRESHOLD_CENTAVOS,
} from '../config/business.js';

export function calcDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  const raw =
    coupon.discount_type === 'percent'
      ? Math.floor((subtotal * coupon.discount_value) / 100)
      : coupon.discount_value;
  return Math.min(raw, subtotal);
}

export function calcShipping(amountAfterDiscount) {
  return amountAfterDiscount >= FREE_SHIPPING_THRESHOLD_CENTAVOS ? 0 : SHIPPING_FLAT_CENTAVOS;
}