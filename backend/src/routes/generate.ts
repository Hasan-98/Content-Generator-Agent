import { Router } from 'express';
import { generate } from '../controllers/generateController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', generate);

export default router;
