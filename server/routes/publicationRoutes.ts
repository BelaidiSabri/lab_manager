import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import {
  searchPublications,
  listPublications,
  createPublication,
  getPublicationById,
  updatePublication,
  deletePublication,
  publicationValidators,
} from '../controllers/publicationController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/search', searchPublications);
router.get('/', listPublications);
router.post('/', auditLogger, publicationValidators, createPublication);
router.get('/:id', getPublicationById);
router.put('/:id', auditLogger, updatePublication);
router.delete('/:id', auditLogger, deletePublication);

export default router;
