import { Router } from 'express';
import { listTopLevels, createTopLevel, updateTopLevel, deleteTopLevel } from '../controllers/topLevelController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listTopLevels);
router.post('/', createTopLevel);
router.patch('/:id', updateTopLevel);
router.delete('/:id', deleteTopLevel);

export default router;
