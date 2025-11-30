import { Router } from 'express';
import authRoutes from './auth.routes';
// 향후 확장을 위해 라우팅만 주석으로 남깁니다.
// import assetRoutes from './asset.routes';
// import inspectionRoutes from './inspection.routes';
// import verificationRoutes from './verification.routes';
// import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
// router.use('/assets', assetRoutes);
// router.use('/inspections', inspectionRoutes);
// router.use('/verifications', verificationRoutes);
// router.use('/users', userRoutes);

export default router;
