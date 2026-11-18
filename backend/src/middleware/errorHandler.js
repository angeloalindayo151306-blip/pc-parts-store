import { AppError } from '../utils/errors.js';

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

// Express recognizes error handlers by the 4 arguments. Keep all 4.
export function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'MALFORMED_JSON';
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  } else {
    // Log the real error on the server only. Never send it to the client.
    console.error(`[${req.id}]`, err);
  }

  res.status(status).json({
    success: false,
    error: { code, message, details },
    requestId: req.id,
  });
}