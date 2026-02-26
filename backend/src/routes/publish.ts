import { Router } from 'express';
import { publish } from '../controllers/publishController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', publish);

export default router;
