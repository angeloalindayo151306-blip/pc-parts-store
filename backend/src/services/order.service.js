import { pool } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { withTransaction } from '../utils/transaction.js';
import * as repo from '../repositories/order.repository.js';
import { lockAndValidate } from './coupon.service.js';
import { calcShipping } from './pricing.js';

export async function createOrder(userId, { shippingAddress, couponCode }, idempotencyKey) {
  // Everything in this block succeeds together or is undone together.
  const result = await withTransaction(async (client) => {
    await repo.lockUser(client, userId);

    // Same key again = same order. Nothing is reserved or charged twice.
    const existingId = await repo.findByIdempotencyKey(client, userId, idempotencyKey);
    if (existingId) return { orderId: existingId, replayed: true };

    const lines = await repo.cartLines(client, userId);
    if (lines.length === 0) throw new AppError(422, 'CART_EMPTY', 'Your cart is empty');

    // Reserve stock line by line (sorted by product id, so two shoppers can't deadlock).
    const items = [];
    for (const line of lines) {
      const reserved = await repo.reserveStock(client, line.product_id, line.quantity);
      if (!reserved) {
        const p = await repo.productState(client, line.product_id);
        const name = p?.name ?? 'A product in your cart';
        if (!p || !p.is_active) {
          throw new AppError(409, 'PRODUCT_UNAVAILABLE', `${name} is no longer available`, {
            product_id: line.product_id,
          });
        }
        throw new AppError(
          409,
          p.stock <= 0 ? 'OUT_OF_STOCK' : 'INSUFFICIENT_STOCK',
          p.stock <= 0 ? `${name} is out of stock` : `Only ${p.stock} of ${name} left`,
          { product_id: line.product_id, name, requested: line.quantity, available: p.stock }
        );
      }
      items.push({
        productId: line.product_id,
        name: reserved.name,
        unitPrice: reserved.price_centavos,
        quantity: line.quantity,
      });
    }

    // Every amount is computed here from database prices. The client sends none.
    const subtotal = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);

    let coupon = null;
    let discount = 0;
    if (couponCode) {
      ({ coupon, discount } = await lockAndValidate(client, {
        code: couponCode,
        userId,
        subtotal,
      }));
    }

    const shipping = calcShipping(subtotal - discount);
    const total = subtotal - discount + shipping;

    const orderId = await repo.insertOrder(client, {
      userId,
      subtotal,
      discount,
      shipping,
      total,
      couponId: coupon ? coupon.id : null,
      idempotencyKey,
      shippingAddress,
    });

    for (const item of items) {
      await repo.insertItem(client, orderId, item);
      await repo.insertReservation(client, orderId, item);
    }
    if (coupon) await repo.insertRedemption(client, { couponId: coupon.id, userId, orderId });

    await repo.insertHistory(client, {
      orderId,
      from: null,
      to: 'pending_payment',
      actorId: userId,
      note: 'Order created',
    });
    await repo.clearCart(client, userId);

    return { orderId, replayed: false };
  });

  const order = await repo.findOrder(pool, result.orderId, userId);
  return { order, replayed: result.replayed };
}

export async function listOrders(userId) {
  return repo.listForUser(pool, userId);
}

// Someone else's order looks exactly like a missing one (404, not 403).
export async function getOrder(userId, orderId) {
  const order = await repo.findOrder(pool, orderId, userId);
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  return order;
}