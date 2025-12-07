import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

router.post('/social/:provider', authController.socialLogin);
router.post('/refresh', authController.refresh);

export default router;
