import { AppError } from '../utils/errors.js';

// source: 'body' (default), 'query' or 'params'
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(new AppError(422, 'VALIDATION_ERROR', 'Invalid input', details));
  }
  req[source] = result.data; // cleaned values only
  next();
};