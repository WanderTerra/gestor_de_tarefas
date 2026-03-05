import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '@/types/task';
import { taskApi, CreateTaskPayload, UpdateTaskPayload, ApiError } from '@/services/api';

export interface AddTaskOptions {
  description?: string;
  isRecurring?: boolean;
  recurringDays?: string[];
  deadline?: string;
  timeLimit?: string;
  assignedToId?: number;
}

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (name: string, status: TaskStatus, options?: AddTaskOptions) => Promise<void>;
  updateTask: (id: number, data: UpdateTaskPayload) => Promise<void>;
  changeStatus: (id: number, status: TaskStatus, reason?: string) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Carregar tarefas ───────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getAll();
      setTasks(data);
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Erro ao carregar tarefas. Verifique se o servidor está rodando.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ─── Adicionar tarefa ───────────────────────────────────────────

  const addTask = useCallback(async (name: string, status: TaskStatus, options?: AddTaskOptions) => {
    try {
      setError(null);
      const payload: CreateTaskPayload = { name, status };
      if (options?.description?.trim()) {
        payload.description = options.description;
      }
      if (options?.isRecurring) {
        payload.isRecurring = true;
        payload.recurringDays = options.recurringDays;
      }
      if (options?.deadline) {
        payload.deadline = options.deadline;
      }
      if (options?.timeLimit) {
        payload.timeLimit = options.timeLimit;
      }
      if (options?.assignedToId) {
        payload.assignedToId = options.assignedToId;
      }
      const newTask = await taskApi.create(payload);
      setTasks(prev => [newTask, ...prev]);
    } catch (err) {
      const message = err instanceof ApiError
        ? err.details
          ? err.details.map(d => d.mensagem).join(', ')
          : err.message
        : 'Erro ao criar tarefa';
      setError(message);
      throw err; // re-throw para o componente saber que falhou
    }
  }, []);

  // ─── Atualizar tarefa ───────────────────────────────────────────

  const updateTask = useCallback(async (id: number, data: UpdateTaskPayload) => {
    try {
      setError(null);
      const updated = await taskApi.update(id, data);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch (err) {
      const message = err instanceof ApiError
        ? err.details
          ? err.details.map(d => d.mensagem).join(', ')
          : err.message
        : 'Erro ao atualizar tarefa';
      setError(message);
      throw err;
    }
  }, []);

  // ─── Mudar status (com ou sem motivo) ───────────────────────────

  const changeStatus = useCallback(async (id: number, status: TaskStatus, reason?: string) => {
    const data: UpdateTaskPayload = { status };
    if (reason !== undefined) {
      data.reason = reason;
    } else {
      data.reason = null; // limpar motivo quando status não requer
    }
    await updateTask(id, data);
  }, [updateTask]);

  // ─── Deletar tarefa ─────────────────────────────────────────────

  const deleteTask = useCallback(async (id: number) => {
    try {
      setError(null);
      await taskApi.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Erro ao deletar tarefa';
      setError(message);
      throw err;
    }
  }, []);

  // ─── Limpar erro ────────────────────────────────────────────────

  const clearError = useCallback(() => setError(null), []);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    changeStatus,
    deleteTask,
    refresh: fetchTasks,
    clearError,
  };
}
