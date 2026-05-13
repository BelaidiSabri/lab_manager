import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import {
  createEncadrementRequest,
  deleteEncadrementRequest,
  encadrementRequestCreateValidators,
  encadrementRequestListValidators,
  encadrementRequestUpdateValidators,
  listDepartments,
  listEncadrementRequests,
  listEncadreurs,
  updateEncadrementRequest,
} from '../controllers/encadrementRequestController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/departments', listDepartments);
router.get('/encadreurs', listEncadreurs);
router.post('/', auditLogger, encadrementRequestCreateValidators, createEncadrementRequest);
router.get('/', encadrementRequestListValidators, listEncadrementRequests);
router.put('/:id', auditLogger, encadrementRequestUpdateValidators, updateEncadrementRequest);
router.delete('/:id', auditLogger, deleteEncadrementRequest);

export default router;
