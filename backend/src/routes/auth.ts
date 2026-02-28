import { Router } from 'express';
import { login, me, impersonate } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/impersonate/:userId', authenticate, requireSuperAdmin, impersonate);

export default router;
