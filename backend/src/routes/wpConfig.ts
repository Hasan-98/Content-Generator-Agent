import { Router } from 'express';
import { getWpConfig, upsertWpConfig, deleteWpConfig, testWpConfig } from '../controllers/wpConfigController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:topLevelId', getWpConfig);
router.put('/:topLevelId', upsertWpConfig);
router.delete('/:topLevelId', deleteWpConfig);
router.post('/:topLevelId/test', testWpConfig);

export default router;
