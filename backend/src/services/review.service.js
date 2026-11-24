import * as reviews from '../repositories/review.repository.js';
import * as products from '../repositories/product.repository.js';
import { AppError } from '../utils/errors.js';

async function requireProduct(productId) {
  const product = await products.findActiveById(productId);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return product;
}

export async function listReviews(productId, { page, limit }) {
  await requireProduct(productId);
  const { items, total, average } = await reviews.listByProduct(productId, { page, limit });
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      averageRating: average,
    },
  };
}

export async function createReview(userId, productId, { rating, comment }) {
  await requireProduct(productId);

  if (!(await reviews.hasPurchased(userId, productId))) {
    throw new AppError(
      403,
      'NOT_VERIFIED_PURCHASE',
      'You can only review products from a paid order'
    );
  }

  const created = await reviews.insert(userId, productId, {
    rating,
    comment: comment || null,
  });
  if (!created) {
    throw new AppError(409, 'REVIEW_EXISTS', 'You already reviewed this product');
  }
  return created;
}

export async function updateReview(userId, productId, { rating, comment }) {
  await requireProduct(productId);
  const updated = await reviews.update(userId, productId, {
    rating,
    comment: comment || null,
  });
  if (!updated) throw new AppError(404, 'REVIEW_NOT_FOUND', 'You have not reviewed this product');
  return updated;
}

export async function deleteReview(userId, productId) {
  await requireProduct(productId);
  const removed = await reviews.remove(userId, productId);
  if (!removed) throw new AppError(404, 'REVIEW_NOT_FOUND', 'You have not reviewed this product');
  return { deleted: true };
}