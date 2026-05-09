import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRoles } from '../middleware/authorize';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import {
  createSupervision,
  deleteSupervision,
  listSupervisions,
  supervisionCreateValidators,
  supervisionListValidators,
  supervisionUpdateValidators,
  updateSupervision,
} from '../controllers/supervisionController';

const router = Router();

router.use(authenticate);

router.get('/', firstLoginGuard, supervisionListValidators, listSupervisions);
router.post(
  '/',
  requireRoles('super_admin'),
  firstLoginGuard,
  auditLogger,
  supervisionCreateValidators,
  createSupervision
);
router.put(
  '/:id',
  requireRoles('super_admin'),
  firstLoginGuard,
  auditLogger,
  supervisionUpdateValidators,
  updateSupervision
);
router.delete('/:id', requireRoles('super_admin'), firstLoginGuard, auditLogger, deleteSupervision);

export default router;
