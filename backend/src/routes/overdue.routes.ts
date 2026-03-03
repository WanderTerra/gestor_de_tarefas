import { Router } from 'express';
import { overdueController } from '../controllers/overdue.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Todas as rotas exigem autenticação
router.use(authenticate);

// Alertas ativos (para o banner)
router.get('/', overdueController.getActive);

// Dispensar todos os alertas
router.post('/acknowledge', overdueController.acknowledgeAll);

// Dispensar um alerta específico
router.post('/:id/acknowledge', overdueController.acknowledge);

// Histórico de alertas
router.get('/history', overdueController.getHistory);

export default router;
