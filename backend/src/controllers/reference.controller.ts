import { Request, Response } from 'express';
import { AssetService } from '../services/asset.service';

const assetService = new AssetService();

export class ReferenceController {
  assetLookup = (_req: Request, res: Response) => {
    const assets = assetService.list();
    const minimal = assets.map((asset) => ({ uid: asset.uid, name: asset.name, assetType: asset.assetType }));
    res.json({ success: true, data: minimal });
  };
}
