import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import { getProfileByUserId, updateProfileByUserId } from '../controllers/profileController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/:userId', getProfileByUserId);
router.put('/:userId', auditLogger, updateProfileByUserId);

export default router;
