import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Todas as rotas de tarefa exigem autenticação
router.use(authenticate);

// Listar e buscar: todos os autenticados
router.get('/completed', taskController.getCompleted);
router.get('/', taskController.getAll);
router.get('/:id', taskController.getById);

// Criar: ambos (gestor e funcionário)
router.post('/', taskController.create);

// Atualizar: ambos (com restrições no controller)
router.put('/:id', taskController.update);

// Deletar: apenas gestores
router.delete('/:id', authorize('manager'), taskController.delete);

export default router;
