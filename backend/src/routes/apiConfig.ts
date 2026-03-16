import { Router } from 'express';
import { getApiConfig, upsertApiConfig, deleteApiKey } from '../controllers/apiConfigController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getApiConfig);
router.put('/', upsertApiConfig);
router.delete('/:key', deleteApiKey);

export default router;
