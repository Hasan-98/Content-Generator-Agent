import { Router } from 'express';
import {
  listDictionary,
  addDictionaryEntry,
  updateDictionaryEntry,
  deleteDictionaryEntry,
} from '../controllers/ttsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listDictionary);
router.post('/', addDictionaryEntry);
router.patch('/:id', updateDictionaryEntry);
router.delete('/:id', deleteDictionaryEntry);

export default router;
