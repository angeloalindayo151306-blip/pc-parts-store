import * as auth from '../services/auth.service.js';
import { ok } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  ok(res, await auth.register(req.body), undefined, 201);
});

export const login = asyncHandler(async (req, res) => {
  ok(res, await auth.login(req.body));
});