import { Router } from 'express';
import { publish, fixThumbnail, fixAllThumbnails } from '../controllers/publishController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', publish);
router.post('/fix-thumbnail', fixThumbnail);
router.post('/fix-all-thumbnails', fixAllThumbnails);

export default router;
