export type UserRole = 'adm' | 'backoffice' | 'supervisor' | 'financeiro' | 'rh' | 'monitor';

// Helper para verificar se é administrador
export function isManagerRole(role: string): boolean {
  return role === 'adm';
}

// Helper para obter o label do role
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    'adm': 'Adm',
    'backoffice': 'Backoffice',
    'supervisor': 'Supervisor',
    'financeiro': 'Financeiro',
    'rh': 'RH',
    'monitor': 'Monitor',
  };
  return labels[role] || role;
}

export type AuthorizationStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  active?: boolean;
  authorizationStatus?: AuthorizationStatus;
  createdAt?: string;
  requestedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
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
