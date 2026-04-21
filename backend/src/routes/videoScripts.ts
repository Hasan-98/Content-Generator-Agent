import { Router } from 'express';
import {
  listVideoScripts,
  getVideoScript,
  generateVideoScriptHandler,
  updateVideoScriptSection,
  generateSectionImage,
  searchSectionBackgrounds,
  setSectionBackground,
  deleteVideoScript,
} from '../controllers/videoScriptController';
import { generateTts, uploadAudio } from '../controllers/ttsController';
import {
  listAvatars,
  updateVideoSettings,
  generateHeygenVideo,
  checkHeygenVideoStatus,
  generateRemotionVideo,
  checkRemotionVideoStatus,
  buildVideoPreview,
} from '../controllers/videoGenController';
import { authenticate } from '../middleware/auth';
import { uploadAudio as uploadAudioMiddleware } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', listVideoScripts);
router.get('/avatars', listAvatars);
router.get('/:id', getVideoScript);
router.post('/generate', generateVideoScriptHandler);
router.patch('/:id/settings', updateVideoSettings);
router.post('/:id/tts', generateTts);
router.post('/:id/upload-audio', uploadAudioMiddleware.single('audio'), uploadAudio);
router.post('/:id/heygen', generateHeygenVideo);
router.post('/:id/heygen-status', checkHeygenVideoStatus);
router.post('/:id/build-preview', buildVideoPreview);
router.post('/:id/remotion', generateRemotionVideo);
router.post('/:id/remotion-status', checkRemotionVideoStatus);
router.patch('/sections/:id', updateVideoScriptSection);
router.post('/sections/:id/generate-image', generateSectionImage);
router.post('/sections/:id/search-backgrounds', searchSectionBackgrounds);
router.patch('/sections/:id/set-background', setSectionBackground);
router.delete('/:id', deleteVideoScript);

export default router;
