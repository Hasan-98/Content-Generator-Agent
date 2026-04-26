import { Router } from 'express';
import {
  createAvatar,
  listAvatars,
  getAvatar,
  refreshAvatar,
  retryAvatar,
  deleteAvatar,
} from '../controllers/heygenAvatarController';
import { authenticate } from '../middleware/auth';
import { uploadAvatarFile } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', listAvatars);
router.post('/', uploadAvatarFile.single('file'), createAvatar);
router.get('/:id', getAvatar);
router.post('/:id/refresh', refreshAvatar);
router.post('/:id/retry', uploadAvatarFile.single('file'), retryAvatar);
router.delete('/:id', deleteAvatar);

export default router;
