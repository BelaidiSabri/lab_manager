import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireMinimumRole, requireRoles } from '../middleware/authorize';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
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
  requireMinimumRole('maitre_assistant'),
  firstLoginGuard,
  auditLogger,
  teamMemberValidators,
  addTeamMember
);
router.delete(
  '/:id/members/:userId',
  requireMinimumRole('maitre_assistant'),
  firstLoginGuard,
  auditLogger,
  teamMemberRemoveValidators,
  removeTeamMember
);

export default router;
