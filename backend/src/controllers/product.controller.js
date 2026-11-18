import * as service from '../services/product.service.js';
import { ok } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listProducts(req.query);
  ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await service.getProduct(req.params.id));
});

export const categories = asyncHandler(async (req, res) => {
  ok(res, await service.listCategories());
});