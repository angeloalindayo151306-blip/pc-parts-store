import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

// Reads "Authorization: Bearer <token>", verifies it, and sets req.user.
export function auth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Login required'));
  }
  try {
    // Only accept the algorithm we sign with.
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    next(
      new AppError(
        401,
        expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        expired ? 'Your session has expired. Please log in again.' : 'Invalid token'
      )
    );
  }
}