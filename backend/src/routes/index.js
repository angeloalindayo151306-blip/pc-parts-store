import { Router } from 'express';
import healthRoutes from './health.routes.js';

const v1 = Router();
v1.use('/health', healthRoutes);

export default v1;