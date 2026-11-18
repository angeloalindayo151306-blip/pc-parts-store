import * as products from '../repositories/product.repository.js';
import { AppError } from '../utils/errors.js';

export async function listProducts(query) {
  const { items, total } = await products.list(query);
  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getProduct(id) {
  const product = await products.findActiveById(id);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return product;
}

export const listCategories = () => products.listCategories();