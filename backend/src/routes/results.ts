import { Router } from 'express';
import { updateResult, deleteResult, skipResult, restoreResult } from '../controllers/resultController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.patch('/:id', updateResult);
router.delete('/:id', deleteResult);
router.post('/:id/skip', skipResult);
router.post('/:id/restore', restoreResult);

export default router;
