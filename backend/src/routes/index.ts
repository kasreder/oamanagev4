import { Router } from 'express';
import authRoutes from './auth.routes';
import assetRoutes from './asset.routes';
import referenceRoutes from './reference.routes';
import userRoutes from './user.routes';
import { publicApiLimiter, authApiLimiter } from '../middlewares/rate-limit.middleware';
import { healthCheck } from '../controllers/health.controller';

const router = Router();

router.get('/health', healthCheck);
router.use('/auth', authApiLimiter, authRoutes);
router.use('/assets', publicApiLimiter, assetRoutes);
router.use('/references', publicApiLimiter, referenceRoutes);
router.use('/users', authApiLimiter, userRoutes);

export default router;
