import { Router } from 'express';
import authRoutes from './auth.routes';
import assetRoutes from './asset.routes';
import { publicApiLimiter, authApiLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authApiLimiter, authRoutes);
router.use('/assets', publicApiLimiter, assetRoutes);

export default router;
