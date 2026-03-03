import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service.js';
import { auditService } from '../services/audit.service.js';
import { createTaskSchema, updateTaskSchema } from '../schemas/task.schema.js';
import { AppError } from '../middleware/errorHandler.js';

export const taskController = {
  /**
   * GET /tasks
   * Gestor vê todas, funcionário vê só as suas
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const tasks = user.role === 'manager'
        ? await taskService.findAll()
        : await taskService.findByUser(user.id);
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new AppError(400, 'ID inválido');
      }
      const task = await taskService.findById(id);

      // Funcionário só pode ver tarefas atribuídas a ele
      if (req.user!.role === 'employee' && task.assignedToId !== req.user!.id) {
        throw new AppError(403, 'Sem permissão para ver esta tarefa');
      }

      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /tasks
   * Gestor atribui para qualquer um, funcionário atribui para si mesmo
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createTaskSchema.parse(req.body);
      const user = req.user!;

      let assignedToId: number;
      if (user.role === 'employee') {
        // Funcionário: tarefa sempre atribuída a si mesmo
        assignedToId = user.id;
      } else {
        // Gestor: pode atribuir a qualquer um (default: si mesmo)
        assignedToId = req.body.assignedToId ? Number(req.body.assignedToId) : user.id;
      }

      const task = await taskService.create({ ...data, assignedToId });

      // Auditoria
      await auditService.log({
        userId: user.id,
        action: 'create',
        entity: 'task',
        entityId: task.id,
        details: JSON.stringify({ name: data.name, assignedToId }),
      });

      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /tasks/:id
   * Funcionário só pode mudar status (e reason) de tarefas atribuídas a ele.
   * Gestor pode editar tudo.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = req.user!;
      const existingTask = await taskService.findById(id);

      if (user.role === 'employee') {
        // Verificar se a tarefa é dele
        if (existingTask.assignedToId !== user.id) {
          throw new AppError(403, 'Sem permissão para alterar esta tarefa');
        }

        // Funcionário só pode mudar status e reason
        const allowedFields = ['status', 'reason'];
        const bodyKeys = Object.keys(req.body);
        const forbidden = bodyKeys.filter(k => !allowedFields.includes(k));
        if (forbidden.length > 0) {
          throw new AppError(403, `Funcionários só podem alterar status e motivo. Campos não permitidos: ${forbidden.join(', ')}`);
        }
      }

      const data = updateTaskSchema.parse(req.body);

      // Se gestor está mudando atribuição
      const assignedToId = (user.role === 'manager' && req.body.assignedToId !== undefined)
        ? (req.body.assignedToId ? Number(req.body.assignedToId) : null)
        : undefined;

      const task = await taskService.update(id, { ...data, assignedToId });

      // Auditoria
      const action = data.status && Object.keys(data).length === 1 ? 'status_change' : 'update';
      await auditService.log({
        userId: user.id,
        action,
        entity: 'task',
        entityId: task.id,
        details: JSON.stringify({
          changes: Object.keys(data),
          ...(data.status && { newStatus: data.status, oldStatus: existingTask.status }),
        }),
      });

      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /tasks/completed
   * Tarefas finalizadas com filtro de período
   */
  async getCompleted(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { from, to } = req.query;

      const params: { from?: Date; to?: Date; userId?: number } = {};

      if (from && typeof from === 'string') {
        // Se for apenas data (YYYY-MM-DD), criar no início do dia no timezone local
        if (from.length === 10) {
          // Formato YYYY-MM-DD - criar data no timezone local
          const [year, month, day] = from.split('-').map(Number);
          const fromDate = new Date(year, month - 1, day, 0, 0, 0, 0);
          params.from = fromDate;
        } else {
          params.from = new Date(from);
        }
      }
      
      if (to && typeof to === 'string') {
        // Se for apenas data (YYYY-MM-DD), criar no final do dia no timezone local
        if (to.length === 10) {
          // Formato YYYY-MM-DD - criar data no timezone local
          const [year, month, day] = to.split('-').map(Number);
          const toDate = new Date(year, month - 1, day, 23, 59, 59, 999);
          params.to = toDate;
        } else {
          params.to = new Date(to);
        }
      }

      // Funcionário só vê as suas
      if (user.role !== 'manager') {
        params.userId = user.id;
      }

      const tasks = await taskService.findCompleted(params);
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /tasks/:id
   * Apenas gestores podem deletar
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const task = await taskService.findById(id);

      await taskService.delete(id);

      // Auditoria
      await auditService.log({
        userId: req.user!.id,
        action: 'delete',
        entity: 'task',
        entityId: id,
        details: JSON.stringify({ name: task.name }),
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
