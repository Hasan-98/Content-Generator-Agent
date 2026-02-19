import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import topLevelRoutes from './routes/topLevels';
import keywordRoutes from './routes/keywords';
import resultRoutes from './routes/results';
import generateRoutes from './routes/generate';

dotenv.config();

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
