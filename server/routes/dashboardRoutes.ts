import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { getDashboardStats } from '../controllers/dashboardController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/stats', getDashboardStats);

export default router;
