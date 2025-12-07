import { Router } from 'express';
import { ReferenceController } from '../controllers/reference.controller';

const router = Router();
const referenceController = new ReferenceController();

router.get('/assets', referenceController.assetLookup);

export default router;
