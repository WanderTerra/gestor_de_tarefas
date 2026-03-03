import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Apenas gestores podem ver auditoria
router.use(authenticate);
router.use(authorize('manager'));

router.get('/', auditController.getAll);

export default router;
