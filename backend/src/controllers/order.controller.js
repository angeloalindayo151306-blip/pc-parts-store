import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import * as service from '../services/order.service.js';
import * as lifecycle from '../services/orderLifecycle.service.js';

const KEY_RE = /^[A-Za-z0-9_-]{8,100}$/;

function readIdempotencyKey(req) {
  const key = req.get('Idempotency-Key');
  if (!key || !KEY_RE.test(key)) {
    throw new AppError(422, 'IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key header is required', [
      { field: 'Idempotency-Key', message: '8 to 100 characters: letters, numbers, - and _' },
    ]);
  }
  return key;
}

export const create = asyncHandler(async (req, res) => {
  const key = readIdempotencyKey(req);
  const { order, replayed } = await service.createOrder(req.user.id, req.body, key);
  ok(res, { ...order, replayed }, undefined, replayed ? 200 : 201);
});

export const list = asyncHandler(async (req, res) => {
  ok(res, await service.listOrders(req.user.id));
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await service.getOrder(req.user.id, req.params.id));
});

export const cancel = asyncHandler(async (req, res) => {
  ok(res, await lifecycle.cancelOrder(req.user.id, req.params.id));
});