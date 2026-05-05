import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/', listNotifications);
router.patch('/:id/read', markNotificationRead);
router.post('/read-all', markAllNotificationsRead);

export default router;
