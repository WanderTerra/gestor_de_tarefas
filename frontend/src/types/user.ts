export type UserRole = 'manager' | 'employee';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  active?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId: number | null;
  details: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

export interface AuditResponse {
  logs: AuditLog[];
  total: number;
}
