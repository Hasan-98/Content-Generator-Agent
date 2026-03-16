import { Router } from 'express';
import { getWpConfig, upsertWpConfig, deleteWpConfig, testWpConfig } from '../controllers/wpConfigController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getWpConfig);
router.put('/', upsertWpConfig);
router.delete('/', deleteWpConfig);
router.post('/test', testWpConfig);

export default router;
