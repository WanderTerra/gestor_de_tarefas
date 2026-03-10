export type TaskStatus = 'pending' | 'in-progress' | 'waiting' | 'completed' | 'not-executed';

export interface Task {
  id: number;
  name: string;
  status: TaskStatus;
  description?: string | null;
  reason?: string | null;
  deadline?: string | null;
  isOverdue: boolean;
  isRecurring: boolean;
  recurringDays?: string | null;
  recurringDayOfMonth?: number | null;
  timeLimit?: string | null;
  estimatedTime?: number | null; // Tempo estimado em minutos
  tutorialLink?: string | null; // Link do tutorial
  assignedToId?: number | null;
  assignedTo?: {
    id: number;
    username: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  textColor: string;
  bgLight: string;
  borderColor: string;
  requiresReason: boolean;
}

export const statusConfig: Record<TaskStatus, StatusConfig> = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    requiresReason: false
  },
  'in-progress': {
    label: 'Em andamento',
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    requiresReason: false
  },
  waiting: {
    label: 'Aguardando ação',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    requiresReason: true
  },
  completed: {
    label: 'Concluído',
    color: 'bg-green-500',
    textColor: 'text-green-500',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    requiresReason: false
  },
  'not-executed': {
    label: 'Não executado',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-200',
    requiresReason: true
  }
};

export const getStatusColorRGB = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    'pending': '250, 204, 21',      // yellow-400 (mais suave)
    'in-progress': '96, 165, 250',  // blue-400 (mais suave)
    'waiting': '251, 146, 60',      // orange-400 (mais suave)
    'completed': '74, 222, 128',     // green-400 (mais suave)
    'not-executed': '248, 113, 113', // red-400 (mais suave)
  };
  return colorMap[status] || '148, 163, 184';
};
