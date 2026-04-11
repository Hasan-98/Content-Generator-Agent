import { Router } from 'express';
import {
  createAvatar,
  listAvatars,
  getAvatar,
  refreshAvatar,
  deleteAvatar,
} from '../controllers/heygenAvatarController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listAvatars);
router.post('/', createAvatar);
router.get('/:id', getAvatar);
router.post('/:id/refresh', refreshAvatar);
router.delete('/:id', deleteAvatar);

export default router;
