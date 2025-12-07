import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller';
import { optionalAuth, requireAuth, requireAdmin } from '../middlewares/optional-auth.middleware';

const router = Router();
const assetController = new AssetController();

router.get('/', optionalAuth, assetController.getAssets);
router.get('/:uid', optionalAuth, assetController.getAssetByUid);
router.post('/', requireAuth, assetController.createAsset);
router.patch('/:uid', requireAuth, assetController.updateAsset);
router.delete('/:uid', requireAuth, requireAdmin, assetController.deleteAsset);

export default router;
