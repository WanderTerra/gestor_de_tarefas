import { Router } from 'express';
import taskRoutes from './task.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import auditRoutes from './audit.routes.js';
import overdueRoutes from './overdue.routes.js';

const router = Router();

// Rotas públicas e de autenticação
router.use('/auth', authRoutes);

// Log para debug em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Rotas de autenticação registradas: /api/auth/login, /api/auth/register');
}

// Rotas protegidas
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);
router.use('/audit', auditRoutes);
router.use('/overdue', overdueRoutes);

// Health check (público)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
