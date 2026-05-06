import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import topLevelRoutes from './routes/topLevels';
import keywordRoutes from './routes/keywords';
import resultRoutes from './routes/results';
import generateRoutes from './routes/generate';
import factcheckRoutes from './routes/factcheck';
import articleRoutes from './routes/articles';
import publishRoutes from './routes/publish';
import wpConfigRoutes from './routes/wpConfig';
import apiConfigRoutes from './routes/apiConfig';
import inviteRoutes from './routes/invites';
import videoScriptRoutes from './routes/videoScripts';
import shopifyConfigRoutes from './routes/shopifyConfig';
import ttsDictionaryRoutes from './routes/ttsDictionary';
import heygenAvatarRoutes from './routes/heygenAvatars';
import promptTemplateRoutes from './routes/promptTemplates';
import mediaRoutes from './routes/media';
import bannerRoutes from './routes/banner';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Ensure upload/audio directories exist on startup
for (const dir of ['uploads', 'audio', 'uploads/media', 'uploads/fonts']) {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/top-levels', topLevelRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/factcheck', factcheckRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/wp-config', wpConfigRoutes);
app.use('/api/api-config', apiConfigRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/video-scripts', videoScriptRoutes);
app.use('/api/shopify-config', shopifyConfigRoutes);
app.use('/api/tts-dictionary', ttsDictionaryRoutes);
app.use('/api/heygen-avatars', heygenAvatarRoutes);
app.use('/api/prompt-templates', promptTemplateRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/banner', bannerRoutes);

// Serve audio files
app.use('/audio', express.static(path.join(__dirname, '..', 'audio')));

// Serve uploaded files (avatars, recordings, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
