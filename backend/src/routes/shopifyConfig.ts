import { Router } from 'express';
import {
  getShopifyConfig,
  upsertShopifyConfig,
  deleteShopifyConfig,
  testShopifyConfig,
} from '../controllers/shopifyConfigController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:topLevelId', getShopifyConfig);
router.put('/:topLevelId', upsertShopifyConfig);
router.delete('/:topLevelId', deleteShopifyConfig);
router.post('/:topLevelId/test', testShopifyConfig);

export default router;
