import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import productRoutes from './product.routes.js';
import * as productController from '../controllers/product.controller.js';

const v1 = Router();
v1.use('/health', healthRoutes);
v1.use('/auth', authRoutes);
v1.use('/admin', adminRoutes);
v1.use('/products', productRoutes);
v1.get('/categories', productController.categories);

export default v1;