import { Router } from 'express';
import { login, me, impersonate, viewAs, editAs } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/view-as/:userId', authenticate, requireAdmin, viewAs);
router.post('/edit-as/:userId', authenticate, requireAdmin, editAs);
router.post('/impersonate/:userId', authenticate, requireSuperAdmin, impersonate);

export default router;
