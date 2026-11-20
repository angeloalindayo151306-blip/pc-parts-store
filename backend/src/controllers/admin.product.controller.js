import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import * as service from '../services/admin.product.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listProducts(req.query);
  ok(res, items, meta);
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await service.getProduct(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  const product = await service.createProduct(req.body, req.user.id);
  ok(res, product, undefined, 201);
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await service.updateProduct(req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  ok(res, await service.deactivateProduct(req.params.id));
});

export const adjustStock = asyncHandler(async (req, res) => {
  ok(res, await service.adjustStock(req.params.id, req.body, req.user.id));
});

export const adjustments = asyncHandler(async (req, res) => {
  ok(res, await service.getAdjustments(req.params.id));
});