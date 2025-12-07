import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/optional-auth.middleware';

const router = Router();
const authController = new AuthController();

router.get('/kakao', authController.kakaoLogin);
router.get('/kakao/callback', authController.kakaoCallback);
router.get('/me', requireAuth, authController.getCurrentUser);
router.post('/logout', requireAuth, authController.logout);
router.post('/social/:provider', authController.socialLogin);
router.post('/refresh', authController.refresh);

export default router;
