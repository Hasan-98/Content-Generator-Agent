import { Router } from 'express';
import { listTopLevels, createTopLevel, updateTopLevel, deleteTopLevel, getCampaignDefaults, upsertCampaignDefaults } from '../controllers/topLevelController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listTopLevels);
router.post('/', createTopLevel);
router.patch('/:id', updateTopLevel);
router.delete('/:id', deleteTopLevel);
router.get('/:id/defaults', getCampaignDefaults);
router.put('/:id/defaults', upsertCampaignDefaults);

export default router;
