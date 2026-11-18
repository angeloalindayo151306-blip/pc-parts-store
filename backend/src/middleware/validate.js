import { AppError } from '../utils/errors.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(new AppError(422, 'VALIDATION_ERROR', 'Invalid input', details));
  }
  req.body = result.data; // cleaned values only
  next();
};