import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireMinimumRole, requireRoles } from '../middleware/authorize';
import { requireCollaborationManager } from '../middleware/requireCollaborationManager';
import { requireTeamManager } from '../middleware/requireTeamManager';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import {
  addTeamCollaboration,
  listTeamCollaborations,
  removeTeamCollaboration,
  teamCollaborationAddValidators,
  teamCollaborationListValidators,
  teamCollaborationRemoveValidators,
  teamCollaborationUpdateValidators,
  updateTeamCollaboration,
} from '../controllers/teamCollaborationController';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getTeamById,
  listTeams,
  removeTeamMember,
  teamCreateValidators,
  teamIdValidators,
  teamMemberValidators,
  teamMemberRemoveValidators,
  teamUpdateValidators,
  updateTeam,
} from '../controllers/teamController';

const router = Router();

router.use(authenticate);

router.get('/', firstLoginGuard, listTeams);
router.get('/:id', firstLoginGuard, teamIdValidators, getTeamById);
router.post(
  '/',
  requireMinimumRole('maitre_assistant'),
  firstLoginGuard,
  auditLogger,
  teamCreateValidators,
  createTeam
);
router.put(
  '/:id',
  requireMinimumRole('maitre_assistant'),
  firstLoginGuard,
  auditLogger,
  teamUpdateValidators,
  updateTeam
);
router.delete('/:id', requireRoles('super_admin'), firstLoginGuard, auditLogger, teamIdValidators, deleteTeam);
router.post(
  '/:id/members',
  requireTeamManager,
  firstLoginGuard,
  auditLogger,
  teamMemberValidators,
  addTeamMember
);
router.delete(
  '/:id/members/:userId',
  requireTeamManager,
  firstLoginGuard,
  auditLogger,
  teamMemberRemoveValidators,
  removeTeamMember
);
router.get('/:id/collaborations', firstLoginGuard, teamCollaborationListValidators, listTeamCollaborations);
router.post(
  '/:id/collaborations',
  requireTeamManager,
  firstLoginGuard,
  auditLogger,
  teamCollaborationAddValidators,
  addTeamCollaboration
);
router.put(
  '/:id/collaborations/:partnerId',
  requireCollaborationManager,
  firstLoginGuard,
  auditLogger,
  teamCollaborationUpdateValidators,
  updateTeamCollaboration
);
router.delete(
  '/:id/collaborations/:partnerId',
  requireCollaborationManager,
  firstLoginGuard,
  auditLogger,
  teamCollaborationRemoveValidators,
  removeTeamCollaboration
);

export default router;
