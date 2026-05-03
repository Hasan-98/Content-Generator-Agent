import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  getBasePrompt,
} from '../controllers/promptTemplateController';

const router = Router();

router.use(authenticate);

router.get('/base', getBasePrompt);
router.get('/', listPromptTemplates);
router.post('/', createPromptTemplate);
router.patch('/:id', updatePromptTemplate);
router.delete('/:id', deletePromptTemplate);

export default router;
