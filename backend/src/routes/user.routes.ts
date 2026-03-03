import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Todas as rotas exigem autenticação + role de gestor
router.use(authenticate);
router.use(authorize('manager'));

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);

export default router;
