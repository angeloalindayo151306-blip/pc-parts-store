import { checkDatabase } from '../services/health.service.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export async function getHealth(req, res, next) {
  try {
    await checkDatabase();
    ok(res, { status: 'ok', database: 'up', time: new Date().toISOString() });
  } catch (err) {
    console.error('Health check failed:', err.message);
    next(new AppError(503, 'DATABASE_UNAVAILABLE', 'Database is not reachable'));
  }
}