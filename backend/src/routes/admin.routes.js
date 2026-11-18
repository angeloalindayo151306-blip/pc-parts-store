import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { ok } from '../utils/response.js';

const router = Router();
router.use(auth, requireRole('admin')); // every route in this file is admin-only

router.get('/ping', (req, res) => ok(res, { message: 'admin access granted' }));

export default router;