import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/authenticate';
import { updateMe, listUsers } from '../controllers/userController';

const router = Router();

router.patch('/me', authenticate, updateMe);
router.get('/', authenticate, requireRoles('administrateur'), listUsers);

export default router;
