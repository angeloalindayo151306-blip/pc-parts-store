import * as auth from '../services/auth.service.js';
import * as users from '../repositories/user.repository.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  ok(res, await auth.register(req.body), undefined, 201);
});

export const login = asyncHandler(async (req, res) => {
  ok(res, await auth.login(req.body));
});

export const me = asyncHandler(async (req, res) => {
  const user = await users.findById(req.user.id);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Account no longer exists');
  ok(res, { user });
});