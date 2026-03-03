import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Login (público)
router.post('/login', authController.login);

// Validar token (autenticado)
router.get('/me', authenticate, authController.me);

export default router;
