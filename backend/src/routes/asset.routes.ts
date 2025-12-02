import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller';
import { optionalAuth, requireAuth, requireAdmin } from '../middlewares/optional-auth.middleware';

const router = Router();
const assetController = new AssetController();

// 공개 접근 (선택적 인증)
router.get('/', optionalAuth, assetController.getAssets);
router.get('/:uid', optionalAuth, assetController.getAssetByUid);

// 인증 필요
router.post('/', requireAuth, assetController.createAsset);
router.patch('/:uid', requireAuth, assetController.updateAsset);

// 관리자 전용
router.delete('/:uid', requireAuth, requireAdmin, assetController.deleteAsset);

export default router;
