import { pool } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { withTransaction } from '../utils/transaction.js';
import * as repo from '../repositories/admin.product.repository.js';

const notFound = () => new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');

function mapDbError(err) {
  if (err && err.code === '23505')
    return new AppError(409, 'PRODUCT_NAME_TAKEN', 'A product with this name already exists');
  if (err && err.code === '23503')
    return new AppError(422, 'CATEGORY_NOT_FOUND', 'That category does not exist');
  return err;
}

export async function listProducts(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const { items, total } = await repo.listAll({
    q: query.q || '',
    status: query.status || 'all',
    page,
    limit,
  });
  return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getProduct(id) {
  const p = await repo.findById(pool, id);
  if (!p) throw notFound();
  return p;
}

export async function createProduct(data, actorId) {
  try {
    return await withTransaction(async (client) => {
      const id = await repo.insert(client, data);
      const stock = data.stock ?? 0;
      if (stock > 0) {
        await repo.insertAdjustment(client, {
          productId: id,
          previousStock: 0,
          newStock: stock,
          reason: 'Initial stock',
          actorId,
        });
      }
      return repo.findById(client, id);
    });
  } catch (err) {
    throw mapDbError(err);
  }
}

export async function updateProduct(id, patch) {
  try {
    return await withTransaction(async (client) => {
      const found = await repo.update(client, id, patch);
      if (!found) throw notFound();
      return repo.findById(client, id);
    });
  } catch (err) {
    throw mapDbError(err);
  }
}

// Soft delete: the row stays (old orders still point to it), but it is hidden.
export async function deactivateProduct(id) {
  return updateProduct(id, { isActive: false });
}

export async function adjustStock(id, { newStock, reason }, actorId) {
  return withTransaction(async (client) => {
    const row = await repo.lockStock(client, id);
    if (!row) throw notFound();
    if (row.stock === newStock) {
      throw new AppError(422, 'NO_STOCK_CHANGE', 'New stock equals the current stock');
    }
    await repo.setStock(client, id, newStock);
    await repo.insertAdjustment(client, {
      productId: id,
      previousStock: row.stock,
      newStock,
      reason,
      actorId,
    });
    const product = await repo.findById(client, id);
    return { product, previous_stock: row.stock, new_stock: newStock, reason };
  });
}

export async function getAdjustments(id) {
  await getProduct(id); // 404 if the product doesn't exist
  return repo.listAdjustments(id);
}