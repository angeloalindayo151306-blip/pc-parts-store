import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import * as service from '../services/cart.service.js';

export const get = asyncHandler(async (req, res) => {
  ok(res, await service.getCart(req.user.id));
});

export const add = asyncHandler(async (req, res) => {
  ok(res, await service.addItem(req.user.id, req.body.productId, req.body.quantity ?? 1));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await service.updateItem(req.user.id, req.params.productId, req.body.quantity));
});

export const remove = asyncHandler(async (req, res) => {
  ok(res, await service.removeItem(req.user.id, req.params.productId));
});

export const clear = asyncHandler(async (req, res) => {
  ok(res, await service.clearCart(req.user.id));
});