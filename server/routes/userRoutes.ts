import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authenticate';
import { requireRoles } from '../middleware/authorize';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import {
  updateMe,
  listUsers,
  createUser,
  getUserById,
  deactivateUser,
  updateUser,
  promoteUser,
} from '../controllers/userController';

const router = Router();

const createUserValidators = [
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8 }),
  body('role').isString().trim(),
  body('currentGrade').optional().isString().trim(),
  body('academicProgram').optional().isIn(['none', 'master', 'doctorate']),
];

router.use(authenticate);
router.use(firstLoginGuard);

router.patch('/me', auditLogger, updateMe);
router.get('/', requireRoles('super_admin'), listUsers);
router.post('/', requireRoles('super_admin'), auditLogger, createUserValidators, createUser);
router.put('/:id', requireRoles('super_admin'), auditLogger, updateUser);
router.post('/:id/promote', requireRoles('super_admin'), auditLogger, promoteUser);
router.get('/:id', getUserById);
router.delete('/:id', requireRoles('super_admin'), auditLogger, deactivateUser);

export default router;
