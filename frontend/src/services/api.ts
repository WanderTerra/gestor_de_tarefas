import { Task, TaskStatus } from '@/types/task';
import { User, AuthResponse, AuditResponse } from '@/types/user';

// Em produção usa sempre /api (mesmo domínio). Em dev usa VITE_API_URL se existir, senão /api.
// Se estiver sendo acessado por IP da rede (não localhost), tenta usar o mesmo IP para o backend
function getApiUrl(): string {
  if (!import.meta.env.DEV) {
    return '/api';
  }

  // Se VITE_API_URL estiver definida, usa ela
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Verificar se window está disponível (não está em SSR)
  if (typeof window === 'undefined') {
    return '/api';
  }

  try {
    // Detecta o hostname atual
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocalhost) {
      // Quando acessa por localhost, usa URL completa para garantir que funcione
      // mesmo se o proxy do Vite não estiver funcionando corretamente
      const backendUrl = 'http://localhost:3001/api';
      console.log('[API] Acesso por localhost. Usando backend em:', backendUrl);
      return backendUrl;
    }
    
    // Se estiver sendo acessado pela rede (IP), usa o mesmo IP com porta do backend
    // O proxy do Vite pode não funcionar quando acessado por IP, então usa URL completa
    const backendUrl = `http://${hostname}:3001/api`;
    console.log('[API] Acesso pela rede detectado. Usando backend em:', backendUrl);
    console.log('[API] Certifique-se de que o backend está acessível neste IP e porta 3001');
    return backendUrl;
  } catch (error) {
    console.error('[API] Erro ao determinar URL da API:', error);
    // Fallback seguro
    return '/api';
  }
}

const API_URL = getApiUrl();

// Log da URL da API em desenvolvimento para debug
if (import.meta.env.DEV) {
  console.log('[API] API_URL configurada como:', API_URL);
}

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
  recurringDayOfMonth?: number;
  timeLimit?: string;
  estimatedTime?: number; // Tempo estimado em minutos
  tutorialLink?: string; // Link do tutorial
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
  recurringDayOfMonth?: number | null;
  timeLimit?: string | null;
  estimatedTime?: number | null; // Tempo estimado em minutos
  tutorialLink?: string | null; // Link do tutorial
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
    let body: any = {};
    try {
      const text = await response.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Se não conseguir fazer parse, usar mensagem padrão
      body = {};
    }

    // Se 401, limpar token (sessão expirada)
    if (response.status === 401) {
      setToken(null);
    }

    // Se 404, mensagem mais clara
    if (response.status === 404) {
      const isDev = import.meta.env.DEV;
      const message = body.error || body.message || 
        (isDev 
          ? 'Backend não encontrado. Verifique se o servidor está rodando na porta 3001.'
          : 'Endpoint não encontrado. Verifique a configuração do servidor.');
      throw new ApiError(response.status, message, body.details);
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

// ─── Helper para fazer requisições com tratamento de erro de rede ────

async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    // Log detalhado em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('[API] Fazendo requisição:', options?.method || 'GET', url);
    }
    const response = await fetch(url, options);
    
    // Log da resposta em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('[API] Resposta recebida:', response.status, response.statusText, 'de', url);
    }
    
    return handleResponse<T>(response);
  } catch (error) {
    // Se for erro de rede (não é ApiError), converter para ApiError
    if (error instanceof ApiError) {
      throw error;
    }
    // Erro de rede (fetch falhou completamente)
    const isDev = import.meta.env.DEV;
    throw new ApiError(
      0,
      isDev
        ? `Erro de conexão. Verifique se o backend está rodando em http://localhost:3001`
        : 'Erro de conexão com o servidor. Tente novamente mais tarde.',
    );
  }
}

// ─── Auth API ────────────────────────────────────────────────────────

export const authApi = {
  async register(username: string, password: string, name: string): Promise<{ message: string; user: User }> {
    return fetchWithErrorHandling<{ message: string; user: User }>(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name }),
    });
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    return fetchWithErrorHandling<AuthResponse>(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  },

  async me(): Promise<{ user: User }> {
    return fetchWithErrorHandling<{ user: User }>(`${API_URL}/auth/me`, {
      headers: authHeaders(),
    });
  },

  async getPendingRequests(): Promise<User[]> {
    const response = await fetch(`${API_URL}/auth/pending`, {
      headers: authHeaders(),
    });
    return handleResponse<User[]>(response);
  },

  async approveUser(userId: number, role: string): Promise<{ message: string; user: User }> {
    const response = await fetch(`${API_URL}/auth/approve`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, role }),
    });
    return handleResponse<{ message: string; user: User }>(response);
  },

  async rejectUser(userId: number, reason?: string): Promise<{ message: string; user: User }> {
    const response = await fetch(`${API_URL}/auth/reject`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, reason }),
    });
    return handleResponse<{ message: string; user: User }>(response);
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
