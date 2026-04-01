import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { sendInvite, validateInvite, acceptInvite } from '../controllers/inviteController';

const router = Router();

// Admin: send invite email
router.post('/', authenticate, requireAdmin, sendInvite);

// Public: validate token before showing form
router.get('/:token', validateInvite);

// Public: accept invite and create account
router.post('/:token/accept', acceptInvite);

export default router;
