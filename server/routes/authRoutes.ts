import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { getBootstrap, register, login, me } from '../controllers/authController';

const router = Router();

router.get('/bootstrap', getBootstrap);
router.post('/register', optionalAuthenticate, register);
router.post('/login', login);
router.get('/me', authenticate, me);

export default router;
