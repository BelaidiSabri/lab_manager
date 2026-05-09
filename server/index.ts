import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import profileRoutes from './routes/profileRoutes';
import concoursRoutes from './routes/concoursRoutes';
import publicationRoutes from './routes/publicationRoutes';
import projectRoutes from './routes/projectRoutes';
import documentRoutes from './routes/documentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import gradeHistoryRoutes from './routes/gradeHistoryRoutes';
import memberRoutes from './routes/memberRoutes';
import notificationRoutes from './routes/notificationRoutes';
import supervisionRoutes from './routes/supervisionRoutes';
import teamRoutes from './routes/teamRoutes';
import { seedSuperAdmin } from './seed';

// TODO: AI Module — Claude API integration (chat assistant, eligibility checker, recommender, writing helper)
// Routes will be: /api/ai/* | Pages: /ai-assistant

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ name: 'lab-manager-api', status: 'ok' });
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/concours', concoursRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/grade-history', gradeHistoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/supervisions', supervisionRoutes);
app.use('/api/teams', teamRoutes);

const PORT = process.env.PORT || 5000;

const start = async (): Promise<void> => {
  await connectDB();
  await seedSuperAdmin();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
