import { Router } from 'express';
import { getPublicLabInfo, listPublicConcours } from '../controllers/publicController';

const router = Router();

router.get('/concours', listPublicConcours);
router.get('/lab', getPublicLabInfo);

export default router;
