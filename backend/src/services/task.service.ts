import { prisma } from '../config/prisma.js';
import { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { overdueService } from './overdue.service.js';

export const taskService = {
  /** Listar todas as tarefas (gestor) */
  async findAll() {
    return prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, username: true, name: true },
        },
      },
    });
  },

  /** Listar tarefas de um funcionário específico */
  async findByUser(userId: number) {
    return prisma.task.findMany({
      where: { assignedToId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, username: true, name: true },
        },
      },
    });
  },

  async findById(id: number) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, username: true, name: true },
        },
      },
    });
    if (!task) {
      throw new AppError(404, 'Tarefa não encontrada');
    }
    return task;
  },

  async create(data: CreateTaskInput & { assignedToId?: number }) {
    return prisma.task.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        reason: data.reason,
        deadline: data.deadline ? new Date(data.deadline) : null,
        isRecurring: data.isRecurring ?? false,
        recurringDays: data.recurringDays ? data.recurringDays.join(',') : null,
        recurringDayOfMonth: data.recurringDayOfMonth ?? null,
        timeLimit: data.timeLimit ?? null,
        estimatedTime: data.estimatedTime, // Obrigatório
        tutorialLink: data.tutorialLink ?? null,
        assignedToId: data.assignedToId ?? null,
      },
      include: {
        assignedTo: {
          select: { id: true, username: true, name: true },
        },
      },
    });
  },

  async update(id: number, data: UpdateTaskInput & { assignedToId?: number | null }) {
    // Verificar se existe
    await taskService.findById(id);

    // Se status não requer motivo, limpar reason
    const statusRequiresReason = data.status && ['waiting', 'not-executed'].includes(data.status);
    const reason = statusRequiresReason ? data.reason : (data.reason === undefined ? undefined : null);

    // Se mudou status para finalizado, limpar isOverdue e resolver alertas
    const clearOverdue = data.status === 'completed';

    if (clearOverdue) {
      await overdueService.resolveByTask(id);
    }

    return prisma.task.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(reason !== undefined && { reason }),
        ...(data.deadline !== undefined && {
          deadline: data.deadline ? new Date(data.deadline) : null,
        }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
        ...(data.recurringDays !== undefined && {
          recurringDays: data.recurringDays ? data.recurringDays.join(',') : null,
        }),
        ...(data.recurringDayOfMonth !== undefined && {
          recurringDayOfMonth: data.recurringDayOfMonth ?? null,
        }),
        ...(data.timeLimit !== undefined && {
          timeLimit: data.timeLimit ?? null,
        }),
        ...(data.estimatedTime !== undefined && {
          estimatedTime: data.estimatedTime ?? null,
        }),
        ...(data.tutorialLink !== undefined && {
          tutorialLink: data.tutorialLink ?? null,
        }),
        ...(data.assignedToId !== undefined && {
          assignedToId: data.assignedToId,
        }),
        // Limpar flag de atraso quando tarefa é finalizada
        ...(clearOverdue && { isOverdue: false }),
      },
      include: {
        assignedTo: {
          select: { id: true, username: true, name: true },
        },
      },
    });
  },

  /** Listar tarefas concluídas com filtro de data */
  async findCompleted(params: { from?: Date; to?: Date; userId?: number }) {
    const where: any = {
      status: 'completed',
    };

    if (params.userId) {
      where.assignedToId = params.userId;
    }

    if (params.from || params.to) {
      where.updatedAt = {};
      if (params.from) where.updatedAt.gte = params.from;
      if (params.to) {
        // Incluir o dia inteiro do "to"
        const toEnd = new Date(params.to);
        toEnd.setHours(23, 59, 59, 999);
        where.updatedAt.lte = toEnd;
      }
    }

    return prisma.task.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, username: true, name: true },
        },
      },
    });
  },

  async delete(id: number) {
    await taskService.findById(id);
    return prisma.task.delete({ where: { id } });
  },
};
