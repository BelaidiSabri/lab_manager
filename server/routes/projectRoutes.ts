import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import {
  listProjects,
  createProject,
  getProjectById,
  updateProject,
  projectValidators,
} from '../controllers/projectController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/', listProjects);
router.post('/', auditLogger, projectValidators, createProject);
router.get('/:id', getProjectById);
router.put('/:id', auditLogger, updateProject);

export default router;
