import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const v1 = Router();
v1.use('/health', healthRoutes);
v1.use('/auth', authRoutes);

export default v1;