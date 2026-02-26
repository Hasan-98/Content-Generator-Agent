import { Router } from 'express';
import { factCheck } from '../controllers/factcheckController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', factCheck);

export default router;
