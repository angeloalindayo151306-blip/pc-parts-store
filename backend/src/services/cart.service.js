import { pool } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { withTransaction } from '../utils/transaction.js';
import * as repo from '../repositories/cart.repository.js';

const MAX_PER_LINE = 99;

function buildCart(rows) {
  const items = rows.map((r) => {
    let issue = null;
    if (!r.is_active) issue = 'UNAVAILABLE';
    else if (r.stock <= 0) issue = 'OUT_OF_STOCK';
    else if (r.quantity > r.stock) issue = 'INSUFFICIENT_STOCK';
    return {
      product_id: r.product_id,
      name: r.name,
      category_name: r.category_name,
      image_url: r.image_url,
      quantity: r.quantity,
      unit_price_centavos: r.price_centavos,
      line_total_centavos: r.price_centavos * r.quantity,
      stock: r.stock,
      issue,
    };
  });
  return {
    items,
    item_count: items.reduce((n, i) => n + i.quantity, 0),
    subtotal_centavos: items.reduce((n, i) => n + i.line_total_centavos, 0),
    can_checkout: items.length > 0 && items.every((i) => i.issue === null),
  };
}

function assertQuantityOk(product, wanted, inCart) {
  if (wanted > MAX_PER_LINE) {
    throw new AppError(422, 'QUANTITY_LIMIT', `You can have at most ${MAX_PER_LINE} of one item`);
  }
  if (product.stock <= 0) {
    throw new AppError(409, 'OUT_OF_STOCK', 'This product is out of stock');
  }
  if (wanted > product.stock) {
    throw new AppError(409, 'INSUFFICIENT_STOCK', `Only ${product.stock} in stock`, {
      available: product.stock,
      in_cart: inCart,
    });
  }
}

export async function getCart(userId) {
  const cartId = await repo.findCartId(pool, userId);
  const rows = cartId ? await repo.listItems(pool, cartId) : [];
  return buildCart(rows);
}

export async function addItem(userId, productId, quantity) {
  await withTransaction(async (client) => {
    const cartId = await repo.getOrCreateCartId(client, userId);
    const product = await repo.findProduct(client, productId);
    if (!product || !product.is_active) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    const existing = (await repo.getQuantity(client, cartId, productId)) ?? 0;
    const wanted = existing + quantity;
    assertQuantityOk(product, wanted, existing);
    await repo.setQuantity(client, cartId, productId, wanted);
  });
  return getCart(userId);
}

export async function updateItem(userId, productId, quantity) {
  await withTransaction(async (client) => {
    const cartId = await repo.getOrCreateCartId(client, userId);
    const existing = await repo.getQuantity(client, cartId, productId);
    if (existing === null) {
      throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'That item is not in your cart');
    }
    const product = await repo.findProduct(client, productId);
    if (!product || !product.is_active) {
      throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'This product is no longer available');
    }
    assertQuantityOk(product, quantity, existing);
    await repo.setQuantity(client, cartId, productId, quantity);
  });
  return getCart(userId);
}

export async function removeItem(userId, productId) {
  await withTransaction(async (client) => {
    const cartId = await repo.getOrCreateCartId(client, userId);
    const removed = await repo.removeItem(client, cartId, productId);
    if (!removed) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'That item is not in your cart');
  });
  return getCart(userId);
}

export async function clearCart(userId) {
  await withTransaction(async (client) => {
    const cartId = await repo.getOrCreateCartId(client, userId);
    await repo.clear(client, cartId);
  });
  return getCart(userId);
}