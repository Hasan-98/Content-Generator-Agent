import { Router } from 'express';
import {
  getArticle,
  updateArticle,
  updateSection,
  updateImage,
  upsertUploadMeta,
} from '../controllers/articleController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:id', getArticle);
router.patch('/:id', updateArticle);
router.patch('/:id/sections/:index', updateSection);
router.patch('/:id/images/:index', updateImage);
router.put('/:id/upload-meta', upsertUploadMeta);

export default router;
