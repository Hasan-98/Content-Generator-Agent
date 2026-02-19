import { Router } from 'express';
import { updateResult, deleteResult } from '../controllers/resultController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.patch('/:id', updateResult);
router.delete('/:id', deleteResult);

export default router;
