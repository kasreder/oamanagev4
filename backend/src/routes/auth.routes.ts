import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/optional-auth.middleware';

const router = Router();
const authController = new AuthController();

// 카카오 로그인 시작
router.get('/kakao', authController.kakaoLogin);

// 카카오 로그인 콜백
router.get('/kakao/callback', authController.kakaoCallback);

// 현재 로그인한 사용자 정보 조회
router.get('/me', requireAuth, authController.getCurrentUser);

// 로그아웃
router.post('/logout', requireAuth, authController.logout);

export default router;
