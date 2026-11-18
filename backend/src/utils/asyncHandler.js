// Express 4 doesn't catch errors from async handlers. This wrapper does.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);