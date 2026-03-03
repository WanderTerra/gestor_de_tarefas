import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Registro público (qualquer um pode se cadastrar)
router.post('/register', authController.register);

// Login (público)
router.post('/login', authController.login);

// Validar token (autenticado)
router.get('/me', authenticate, authController.me);

// Solicitações pendentes (apenas gestores)
router.get('/pending', authenticate, authorize('adm'), authController.getPendingRequests);

// Aprovar usuário (apenas gestores)
router.post('/approve', authenticate, authorize('adm'), authController.approveUser);

// Rejeitar usuário (apenas gestores)
router.post('/reject', authenticate, authorize('adm'), authController.rejectUser);

export default router;
