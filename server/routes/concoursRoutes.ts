import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRoles } from '../middleware/authorize';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import {
  listConcours,
  listMyCandidatures,
  createConcours,
  getConcoursById,
  updateConcours,
  applyConcours,
  listCandidatures,
  updateCandidature,
  concoursCreateValidators,
  concoursUpdateValidators,
  candidatureUpdateValidators,
} from '../controllers/concoursController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/', listConcours);
router.get('/my/candidatures', listMyCandidatures);
router.post('/', requireRoles('super_admin'), auditLogger, concoursCreateValidators, createConcours);
router.get('/:id', getConcoursById);
router.put('/:id', requireRoles('super_admin'), auditLogger, concoursUpdateValidators, updateConcours);
router.post('/:id/apply', auditLogger, applyConcours);
router.get('/:id/candidatures', requireRoles('super_admin'), listCandidatures);
router.put(
  '/:id/candidatures/:cid',
  requireRoles('super_admin'),
  auditLogger,
  candidatureUpdateValidators,
  updateCandidature
);

export default router;
