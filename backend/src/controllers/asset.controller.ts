import { Request, Response } from 'express';
import { AssetService } from '../services/asset.service';

const assetService = new AssetService();

export class AssetController {
  getAssets = (req: Request, res: Response) => {
    const assets = assetService.list(req.user);
    res.json({ success: true, data: assets });
  };

  getAssetByUid = (req: Request, res: Response) => {
    const asset = assetService.find(req.params.uid, req.user);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: '자산을 찾을 수 없습니다.',
      });
    }

    res.json({ success: true, data: asset });
  };

  createAsset = (req: Request, res: Response) => {
    const created = assetService.create(req.body);
    res.status(201).json({ success: true, data: created });
  };

  updateAsset = (req: Request, res: Response) => {
    const updated = assetService.update(req.params.uid, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: '자산을 찾을 수 없습니다.',
      });
    }

    res.json({ success: true, data: updated });
  };

  deleteAsset = (req: Request, res: Response) => {
    const removed = assetService.remove(req.params.uid);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: '자산을 찾을 수 없습니다.',
      });
    }

    res.json({ success: true, message: '자산이 삭제되었습니다.' });
  };
}
