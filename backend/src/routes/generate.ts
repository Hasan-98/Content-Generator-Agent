import { Router } from 'express';
import {
  generate,
  generatePersona,
  regenerateFieldHandler,
  generateArticleHandler,
  regenerateSectionHandler,
  regenerateSectionHeadingHandler,
  regenerateTitleHandler,
  generateImageHandler,
  generateImagesBulk,
  regenerateOverlayTitleHandler,
  formatArticleHandler,
} from '../controllers/generateController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', generate);
router.post('/persona', generatePersona);
router.post('/persona-field', regenerateFieldHandler);
router.post('/article', generateArticleHandler);
router.post('/article-section', regenerateSectionHandler);
router.post('/article-section-heading', regenerateSectionHeadingHandler);
router.post('/regenerate-title', regenerateTitleHandler);
router.post('/image', generateImageHandler);
router.post('/images-bulk', generateImagesBulk);
router.post('/regenerate-overlay-title', regenerateOverlayTitleHandler);
router.post('/format-article', formatArticleHandler);

export default router;
