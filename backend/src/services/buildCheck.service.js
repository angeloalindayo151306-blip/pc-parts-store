import { AppError } from '../utils/errors.js';
import * as repo from '../repositories/compatibility.repository.js';
import { checkCompatibility } from './compatibility.service.js';

export async function checkProducts(productIds) {
  const ids = [...new Set(productIds.map((id) => id.toLowerCase()))];
  const rows = await repo.findByIds(ids);

  const found = new Set(rows.map((r) => r.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Some products were not found.', missing);
  }

  const issues = checkCompatibility(rows);
  return {
    compatible: issues.length === 0,
    issues,
    items: rows.map(({ id, name, category }) => ({ id, name, category })),
  };
}