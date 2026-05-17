import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireMinimumRole } from '../middleware/authorize';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import {
  addProjectMember,
  addProjectTeam,
  createProject,
  deleteProject,
  getProjectById,
  linkProjectPublication,
  listProjects,
  projectIdValidators,
  projectListValidators,
  projectMemberRemoveValidators,
  projectMemberValidators,
  projectPublicationRemoveValidators,
  projectPublicationValidators,
  projectValidators,
  removeProjectMember,
  removeProjectTeam,
  projectTeamRemoveValidators,
  projectTeamValidators,
  unlinkProjectPublication,
  updateProject,
} from '../controllers/projectController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

router.get('/', projectListValidators, listProjects);
router.post(
  '/',
  requireMinimumRole('maitre_assistant'),
  auditLogger,
  projectValidators,
  createProject
);
router.get('/:id', projectIdValidators, getProjectById);
router.put('/:id', auditLogger, projectIdValidators, projectValidators, updateProject);
router.delete('/:id', auditLogger, projectIdValidators, deleteProject);
router.post(
  '/:id/members',
  auditLogger,
  projectMemberValidators,
  addProjectMember
);
router.delete(
  '/:id/members/:userId',
  auditLogger,
  projectMemberRemoveValidators,
  removeProjectMember
);
router.post('/:id/teams', auditLogger, projectTeamValidators, addProjectTeam);
router.delete(
  '/:id/teams/:teamId',
  auditLogger,
  projectTeamRemoveValidators,
  removeProjectTeam
);
router.post(
  '/:id/publications',
  auditLogger,
  projectPublicationValidators,
  linkProjectPublication
);
router.delete(
  '/:id/publications/:publicationId',
  auditLogger,
  projectPublicationRemoveValidators,
  unlinkProjectPublication
);

export default router;
