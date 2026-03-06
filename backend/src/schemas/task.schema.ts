import { z } from 'zod';

export const TaskStatus = z.enum([
  'pending',
  'in-progress',
  'waiting',
  'completed',
  'not-executed',
]);

const DaysOfWeek = z.enum(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']);

export const createTaskSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().max(1000).optional(),
  status: TaskStatus.default('pending'),
  reason: z.string().max(500).optional(),
  deadline: z.string().datetime().optional(),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(DaysOfWeek).optional(),
  recurringDayOfMonth: z.number().int().min(1).max(31).optional(),
  timeLimit: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').optional(),
}).refine(
  (data) => {
    // Se status requer motivo, reason é obrigatório
    const requiresReason = ['waiting', 'not-executed'].includes(data.status);
    if (requiresReason && (!data.reason || data.reason.trim() === '')) {
      return false;
    }
    return true;
  },
  { message: 'Motivo é obrigatório para este status', path: ['reason'] },
).refine(
  (data) => {
    // Se é recorrente, deve ter pelo menos um dia selecionado
    if (data.isRecurring && (!data.recurringDays || data.recurringDays.length === 0)) {
      return false;
    }
    return true;
  },
  { message: 'Selecione pelo menos um dia para tarefas recorrentes', path: ['recurringDays'] },
);

export const updateTaskSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: TaskStatus.optional(),
  reason: z.string().max(500).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  isRecurring: z.boolean().optional(),
  recurringDays: z.array(DaysOfWeek).nullable().optional(),
  recurringDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  timeLimit: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').nullable().optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
}).refine(
  (data) => {
    // Se está mudando para status que requer motivo, reason deve ser fornecido
    const requiresReason = data.status && ['waiting', 'not-executed'].includes(data.status);
    if (requiresReason && (!data.reason || data.reason.trim() === '')) {
      return false;
    }
    return true;
  },
  { message: 'Motivo é obrigatório para este status', path: ['reason'] },
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
