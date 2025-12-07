import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/optional-auth.middleware';

const router = Router();
const userController = new UserController();

router.get('/me', requireAuth, userController.me);
router.patch('/me', requireAuth, userController.updateMe);

export default router;
