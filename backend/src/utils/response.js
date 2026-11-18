export function ok(res, data, meta = undefined, status = 200) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}