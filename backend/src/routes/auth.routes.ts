import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @route   GET /auth/kakao
 * @desc    카카오 로그인 시작
 * @access  Public
 */
router.get('/kakao', authController.kakaoLogin);

/**
 * @route   GET /auth/kakao/callback
 * @desc    카카오 로그인 콜백
 * @access  Public
 */
router.get('/kakao/callback', authController.kakaoCallback);

/**
 * @route   GET /auth/me
 * @desc    현재 로그인한 사용자 정보 조회
 * @access  Private
 */
router.get('/me', isAuthenticated, authController.getCurrentUser);

/**
 * @route   POST /auth/logout
 * @desc    로그아웃
 * @access  Private
 */
router.post('/logout', isAuthenticated, authController.logout);

export default router;
