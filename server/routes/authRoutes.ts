import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authenticate';
import { loginRateLimiter } from '../middleware/rateLimiter';
import {
  login,
  refresh,
  logout,
  changePassword,
  me,
} from '../controllers/authController';

const router = Router();

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().trim().isLength({ min: 8 }),
];

const changePasswordValidators = [
  body('currentPassword').isString().trim().isLength({ min: 1 }),
  body('newPassword').isString().trim().isLength({ min: 8 }),
];

router.post('/login', loginRateLimiter, loginValidators, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/change-password', authenticate, changePasswordValidators, changePassword);
router.get('/me', authenticate, me);

export default router;
