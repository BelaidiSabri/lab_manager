import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { listMemberDirectory } from '../controllers/memberDirectoryController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/', listMemberDirectory);

export default router;
