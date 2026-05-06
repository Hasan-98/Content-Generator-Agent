import { Router } from 'express';
import multer from 'multer';
import {
  renderBanner,
  listSizes,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listColorThemes,
  createColorTheme,
  updateColorTheme,
  deleteColorTheme,
  listTextTemplates,
  createTextTemplate,
  updateTextTemplate,
  deleteTextTemplate,
  listCustomFonts,
  uploadCustomFont,
  deleteCustomFont,
} from '../controllers/bannerController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const fontUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['font/woff2', 'font/woff', 'font/ttf', 'font/otf', 'application/font-woff2', 'application/font-woff', 'application/x-font-ttf', 'application/x-font-otf'];
    const looksLikeFont = ok.includes(file.mimetype) || /\.(woff2?|ttf|otf)$/i.test(file.originalname);
    if (looksLikeFont) cb(null, true);
    else cb(new Error('Only woff2/woff/ttf/otf font files are allowed'));
  },
});

router.post('/render', renderBanner);
router.get('/sizes', listSizes);

router.get('/projects', listProjects);
router.post('/projects', createProject);
router.patch('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);

router.get('/themes', listColorThemes);
router.post('/themes', createColorTheme);
router.patch('/themes/:id', updateColorTheme);
router.delete('/themes/:id', deleteColorTheme);

router.get('/text-templates', listTextTemplates);
router.post('/text-templates', createTextTemplate);
router.patch('/text-templates/:id', updateTextTemplate);
router.delete('/text-templates/:id', deleteTextTemplate);

router.get('/fonts', listCustomFonts);
router.post('/fonts', fontUpload.single('file'), uploadCustomFont);
router.delete('/fonts/:id', deleteCustomFont);

export default router;
