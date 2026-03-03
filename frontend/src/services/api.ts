import { Task, TaskStatus } from '@/types/task';
import { User, AuthResponse, AuditResponse } from '@/types/user';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Token Management ──────────────────────────────────────────────

let authToken: string | null = localStorage.getItem('token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function getToken(): string | null {
  return authToken;
}

// ─── Tipos para payloads ────────────────────────────────────────────

export interface CreateTaskPayload {
  name: string;
  description?: string;
  status?: TaskStatus;
  reason?: string;
  deadline?: string;
  isRecurring?: boolean;
  recurringDays?: string[];
  timeLimit?: string;
  assignedToId?: number;
}

export interface UpdateTaskPayload {
  name?: string;
  description?: string;
  status?: TaskStatus;
  reason?: string | null;
  deadline?: string | null;
  isRecurring?: boolean;
  recurringDays?: string[] | null;
  timeLimit?: string | null;
  assignedToId?: number | null;
}

// ─── Erro customizado da API ────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  details?: Array<{ campo: string; mensagem: string }>;

  constructor(status: number, message: string, details?: Array<{ campo: string; mensagem: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ─── Helper para headers autenticados ────────────────────────────────

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

// ─── Helper para processar respostas ────────────────────────────────

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    // Se 401, limpar token (sessão expirada)
    if (response.status === 401) {
      setToken(null);
    }

    throw new ApiError(
      response.status,
      body.error || body.message || `Erro ${response.status}`,
      body.details,
    );
  }

  // DELETE retorna 204 sem body
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ─── Auth API ────────────────────────────────────────────────────────

export const authApi = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse<AuthResponse>(response);
  },

  async me(): Promise<{ user: User }> {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: authHeaders(),
    });
    return handleResponse<{ user: User }>(response);
  },
};

// ─── Task API ────────────────────────────────────────────────────────

export const taskApi = {
  async getAll(): Promise<Task[]> {
    const response = await fetch(`${API_URL}/tasks`, {
      headers: authHeaders(),
    });
    return handleResponse<Task[]>(response);
  },

  async getById(id: number): Promise<Task> {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      headers: authHeaders(),
    });
    return handleResponse<Task>(response);
  },

  async create(data: CreateTaskPayload): Promise<Task> {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Task>(response);
  },

  async update(id: number, data: UpdateTaskPayload): Promise<Task> {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Task>(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse<void>(response);
  },

  async getCompleted(params?: { from?: string; to?: string }): Promise<Task[]> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    const url = `${API_URL}/tasks/completed?${searchParams.toString()}`;
    const response = await fetch(url, {
      headers: authHeaders(),
    });
    return handleResponse<Task[]>(response);
  },
};

// ─── User API (gestor) ──────────────────────────────────────────────

export const userApi = {
  async getAll(): Promise<User[]> {
    const response = await fetch(`${API_URL}/users`, {
      headers: authHeaders(),
    });
    return handleResponse<User[]>(response);
  },

  async create(data: { username: string; password: string; name: string; role?: string }): Promise<User> {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<User>(response);
  },

  async update(id: number, data: { name?: string; password?: string; role?: string; active?: boolean }): Promise<User> {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<User>(response);
  },
};

// ─── Overdue Alerts API ──────────────────────────────────────────────

export interface OverdueAlert {
  id: number;
  taskId: number;
  userId: number | null;
  detectedAt: string;
  referenceDate: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  status: 'active' | 'acknowledged' | 'resolved';
  task: Task;
  user: {
    id: number;
    name: string;
  } | null;
}

export const overdueApi = {
  /** Buscar alertas ativos (para o banner) */
  async getActive(): Promise<OverdueAlert[]> {
    const response = await fetch(`${API_URL}/overdue`, {
      headers: authHeaders(),
    });
    return handleResponse<OverdueAlert[]>(response);
  },

  /** Dispensar todos os alertas (fechar o banner) */
  async acknowledgeAll(): Promise<void> {
    const response = await fetch(`${API_URL}/overdue/acknowledge`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse<void>(response);
  },
};

// ─── Audit API (gestor) ─────────────────────────────────────────────

export const auditApi = {
  async getAll(params?: {
    entity?: string;
    entityId?: number;
    userId?: number;
    limit?: number;
    offset?: number;
  }): Promise<AuditResponse> {
    const searchParams = new URLSearchParams();
    if (params?.entity) searchParams.set('entity', params.entity);
    if (params?.entityId) searchParams.set('entityId', String(params.entityId));
    if (params?.userId) searchParams.set('userId', String(params.userId));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const url = `${API_URL}/audit?${searchParams.toString()}`;
    const response = await fetch(url, {
      headers: authHeaders(),
    });
    return handleResponse<AuditResponse>(response);
  },
};
