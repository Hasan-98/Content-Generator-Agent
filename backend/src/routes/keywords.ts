import { Router } from 'express';
import { createKeyword, updateKeyword, deleteKeyword } from '../controllers/keywordController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createKeyword);
router.patch('/:id', updateKeyword);
router.delete('/:id', deleteKeyword);

export default router;
