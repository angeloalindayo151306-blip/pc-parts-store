import { AppError } from '../utils/errors.js';

// Use after auth: router.use(auth, requireRole('admin'))
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Login required'));
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do this'));
  }
  next();
};