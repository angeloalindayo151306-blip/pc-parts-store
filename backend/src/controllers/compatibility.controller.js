import * as service from '../services/buildCheck.service.js';
import { ok } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const check = asyncHandler(async (req, res) => {
  ok(res, await service.checkProducts(req.body.productIds));
});