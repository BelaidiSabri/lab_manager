import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRoles } from '../middleware/authorize';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { listGradeHistory } from '../controllers/gradeHistoryController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/', requireRoles('super_admin'), listGradeHistory);

export default router;
