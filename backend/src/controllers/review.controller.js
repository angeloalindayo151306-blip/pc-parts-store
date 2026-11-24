import * as service from '../services/review.service.js';
import { ok } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listReviews(req.params.id, req.query);
  ok(res, items, meta);
});

export const create = asyncHandler(async (req, res) => {
  const review = await service.createReview(req.user.id, req.params.id, req.body);
  ok(res, review, undefined, 201);
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await service.updateReview(req.user.id, req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  ok(res, await service.deleteReview(req.user.id, req.params.id));
});