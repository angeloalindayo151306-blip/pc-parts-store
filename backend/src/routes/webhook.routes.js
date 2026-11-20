import express, { Router } from 'express';
import * as webhook from '../controllers/webhook.controller.js';

const router = Router();

// Raw body (Buffer), not parsed JSON.
router.post('/maya/:token', express.raw({ type: '*/*', limit: '100kb' }), webhook.receive);

export default router;