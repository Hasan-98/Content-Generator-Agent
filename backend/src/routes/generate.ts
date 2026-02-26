import { Router } from 'express';
import {
  generate,
  generatePersona,
  regenerateFieldHandler,
  generateArticleHandler,
  regenerateSectionHandler,
  generateImageHandler,
  generateImagesBulk,
} from '../controllers/generateController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', generate);
router.post('/persona', generatePersona);
router.post('/persona-field', regenerateFieldHandler);
router.post('/article', generateArticleHandler);
router.post('/article-section', regenerateSectionHandler);
router.post('/image', generateImageHandler);
router.post('/images-bulk', generateImagesBulk);

export default router;
