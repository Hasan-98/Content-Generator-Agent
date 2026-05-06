import { Router } from 'express';
import multer from 'multer';
import {
  searchPhotos,
  searchVideos,
  generateImage,
  uploadLibrary,
  importFromUrl,
  listLibrary,
  deleteLibraryItem,
} from '../controllers/mediaController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Library uploads come in via memory storage (we write to disk in the controller
// after generating an internal ID — keeps filenames predictable).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only image or video files are allowed'));
  },
});

router.get('/search/photos', searchPhotos);
router.get('/search/videos', searchVideos);
router.post('/generate/image', generateImage);

router.get('/library', listLibrary);
router.post('/library', upload.single('file'), uploadLibrary);
router.post('/library/from-url', importFromUrl);
router.delete('/library/:id', deleteLibraryItem);

export default router;
