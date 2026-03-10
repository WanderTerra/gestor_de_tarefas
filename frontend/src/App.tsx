import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Loader2, AlertCircle,
  CheckCircle2, Clock, Pencil, Trash2, ArrowRight,
  X, User as UserIcon, Repeat, Filter, Building2, ChevronDown,
} from 'lucide-react';
import { TaskStatus, statusConfig } from '@/types/task';
import { User, getRoleLabel } from '@/types/user';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { userApi, overdueApi, OverdueAlert } from '@/services/api';
import LoginPage from '@/components/LoginPage';
import RegisterPage from '@/components/RegisterPage';
import PendingApprovalPage from '@/components/PendingApprovalPage';
import RejectedPage from '@/components/RejectedPage';
import UserManagement from '@/components/UserManagement';
import AuditLogView from '@/components/AuditLogView';
import EditTaskDialog from '@/components/EditTaskDialog';
import TransferTaskDialog from '@/components/TransferTaskDialog';
import GeneralPage from '@/components/GeneralPage';
import AuthorizationRequestsPage from '@/components/AuthorizationRequestsPage';
import AllTasksPage from '@/components/AllTasksPage';
import Header from '@/components/Header';
import CreateTaskWizard from '@/components/CreateTaskWizard';
import type { Task } from '@/types/task';

type Page = 'tasks' | 'users' | 'audit' | 'general' | 'all-tasks' | 'register' | 'pending-approval' | 'authorization-requests';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [showRegister, setShowRegister] = React.useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (showRegister) {
      return <RegisterPage onBack={() => setShowRegister(false)} />;
    }
    return <LoginPage onRegister={() => setShowRegister(true)} />;
  }

  if (user.authorizationStatus === 'pending') {
    return <PendingApprovalPage />;
  }

  if (user.authorizationStatus === 'rejected') {
    return <RejectedPage />;
  }

  return <TaskApp />;
};

const TaskApp: React.FC = () => {
  const { isManager, user } = useAuth();
  const {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    changeStatus,
    deleteTask,
    clearError,
  } = useTasks();

  const { checkOverdueTasks, checkOverdueAlerts, checkPendingRequests } = useNotifications();

  const [page, setPage] = useState<Page>('tasks');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [flippedCardReason, setFlippedCardReason] = useState<string>('');
  const [flippedCardStatus, setFlippedCardStatus] = useState<TaskStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingReason, setSavingReason] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [transferTask, setTransferTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [overdueAlerts, setOverdueAlerts] = useState<OverdueAlert[]>([]);
  const [fadingCards, setFadingCards] = useState<Set<number>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string>('all'); // Filtro por usuário para gestores
  const [collapsedRoles, setCollapsedRoles] = useState<Set<string>>(new Set()); // Setores recolhidos (dropdown)
  const filterSectionRef = useRef<HTMLDivElement>(null);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const congratulationsShownRef = useRef<Set<string>>(new Set()); // Para não repetir no mesmo dia

  const toggleRoleCollapsed = useCallback((roleKey: string) => {
    setCollapsedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) next.delete(roleKey);
      else next.add(roleKey);
      return next;
    });
  }, []);

  // Relógio que atualiza a cada minuto para verificar horários limite
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 30_000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  // Ao mudar o filtro de usuário, rolar para o topo (filtro) após o re-render
  useEffect(() => {
    if (page !== 'tasks') return;
    const t = setTimeout(() => {
      filterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(t);
  }, [selectedUserId, page]);

  const isTerminalStatus = useCallback(
    (status: TaskStatus) => status === 'completed' || status === 'not-executed',
    [],
  );

  /** Helper para obter cor RGB do status para badges de vidro transparente (cores suaves/pastéis) */
  const getStatusColorRGB = (status: TaskStatus): string => {
    const colorMap: Record<TaskStatus, string> = {
      'pending': '250, 204, 21',      // yellow-400 (mais suave)
      'in-progress': '96, 165, 250',  // blue-400 (mais suave)
      'waiting': '251, 146, 60',      // orange-400 (mais suave)
      'completed': '74, 222, 128',     // green-400 (mais suave)
      'not-executed': '248, 113, 113', // red-400 (mais suave)
    };
    return colorMap[status] || '148, 163, 184';
  };

  /** Converte string "seg,qua,sex" em labels legíveis */
  const formatRecurringDays = (days: string | null | undefined): string => {
    if (!days) return '';
    const dayMap: Record<string, string> = {
      dom: 'Dom', seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb',
    };
    return days.split(',').map(d => dayMap[d] || d).join(', ');
  };

  /** Verifica se uma tarefa está atrasada (horário limite ultrapassado OU flag isOverdue do backend) */
  const isTaskOverdue = useCallback(
    (task: Task): boolean => {
      // Tarefa concluída nunca mostra atrasada
      if (task.status === 'completed') return false;
      
      // PRIORIDADE 1: Se o backend já marcou como atrasada, respeitar (mas verificar se não é mensal/semanal no dia errado)
      if (task.isOverdue) {
        // Se é tarefa mensal, verificar se realmente deveria estar atrasada
        if (task.isRecurring && task.recurringDayOfMonth !== null && task.recurringDayOfMonth !== undefined) {
          const today = new Date();
          const todayDay = today.getDate();
          // Se não é o dia do mês, não está atrasada (mesmo que backend tenha marcado)
          if (todayDay !== task.recurringDayOfMonth) {
            return false;
          }
          // Se é o dia correto, verificar se o horário já passou
          if (task.timeLimit) {
            return currentTime >= task.timeLimit;
          }
          // Se não tem timeLimit, não está atrasada
          return false;
        }
        
        // Se é tarefa semanal, verificar se hoje é um dos dias configurados
        if (task.isRecurring && task.recurringDays) {
          const today = new Date();
          const todayDayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
          const dayMap: Record<number, string> = {
            0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab',
          };
          const todayDayName = dayMap[todayDayOfWeek];
          const recurringDaysArray = task.recurringDays.split(',');
          
          // Se hoje não é um dos dias de recorrência, não está atrasada
          if (!recurringDaysArray.includes(todayDayName)) {
            return false;
          }
          
          // Se hoje é um dia de recorrência, verificar se o horário já passou
          if (task.timeLimit) {
            return currentTime >= task.timeLimit;
          }
          return false;
        }
        
        // Para outras tarefas, respeitar a flag do backend
        return true;
      }
      
      // PRIORIDADE 2: Se tem deadline, tratar como tarefa única (mesmo que isRecurring esteja true)
      // Isso corrige casos onde a tarefa foi criada como única mas isRecurring está incorreto
      if (task.deadline) {
        try {
          const deadlineDate = new Date(task.deadline);
          // Normalizar para meia-noite (local) para comparação de data apenas
          deadlineDate.setHours(0, 0, 0, 0);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Se o deadline é no futuro, não está atrasada
          if (deadlineDate > today) {
            return false;
          }
          
          // Se o deadline é hoje, verificar se o horário já passou
          if (deadlineDate.getTime() === today.getTime()) {
            if (task.timeLimit) {
              return currentTime >= task.timeLimit;
            }
            // Se não tem timeLimit mas deadline é hoje, não está atrasada ainda
            return false;
          }
          
          // Se o deadline já passou (dia anterior), está atrasada
          if (deadlineDate < today) {
            return true;
          }
        } catch (err) {
          console.error('Erro ao processar deadline da tarefa:', task.id, err);
          return false;
        }
        
        return false;
      }
      
      // PRIORIDADE 3: Para tarefas recorrentes mensais (com recurringDayOfMonth)
      // IMPORTANTE: Verificar se recurringDayOfMonth é um número válido (1-31)
      if (task.isRecurring && 
          task.recurringDayOfMonth !== null && 
          task.recurringDayOfMonth !== undefined && 
          task.recurringDayOfMonth >= 1 && 
          task.recurringDayOfMonth <= 31) {
        const today = new Date();
        const todayDay = today.getDate();
        // Só considerar atrasada se hoje for o dia do mês especificado E o horário já passou
        if (todayDay === task.recurringDayOfMonth && task.timeLimit) {
          return currentTime >= task.timeLimit;
        }
        // Se não é o dia do mês, não está atrasada
        return false;
      }
      
      // PRIORIDADE 4: Para tarefas recorrentes semanais (sem recurringDayOfMonth ou com valor inválido)
      // Verificar se hoje é um dos dias da semana configurados E o horário já passou
      if (task.isRecurring && task.timeLimit && task.recurringDays) {
        const today = new Date();
        const todayDayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
        const dayMap: Record<number, string> = {
          0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab',
        };
        const todayDayName = dayMap[todayDayOfWeek];
        const recurringDaysArray = task.recurringDays.split(',');
        
        // Se hoje não é um dos dias de recorrência, não está atrasada
        if (!recurringDaysArray.includes(todayDayName)) {
          return false;
        }
        
        // Se hoje é um dia de recorrência, verificar se o horário já passou
        return currentTime >= task.timeLimit;
      }
      
      return false;
    },
    [currentTime],
  );

  // Tarefas aparecem apenas se não tiverem status terminal OU se estiverem em animação de fade
  // Tarefas recorrentes concluídas serão resetadas automaticamente pelo backend para "pending"
  const activeTasks = tasks.filter(
    (t) => !isTerminalStatus(t.status) || fadingCards.has(t.id),
  );

  // Filtrar tarefas por usuário (se gestor e filtro selecionado)
  const filteredActiveTasks = isManager && selectedUserId !== 'all'
    ? activeTasks.filter(t => t.assignedToId === parseInt(selectedUserId))
    : activeTasks;

  // Verificar se todas as tarefas estão concluídas
  useEffect(() => {
    if (loading || !tasks.length) {
      setShowCongratulations(false);
      return;
    }

    // Filtrar tarefas do usuário atual (não gestor vê só as suas, gestor vê todas se não filtrado)
    const userTasks = isManager && selectedUserId !== 'all'
      ? tasks.filter(t => t.assignedToId === parseInt(selectedUserId))
      : isManager
      ? tasks
      : tasks.filter(t => t.assignedToId === user?.id);

    // Verificar se há tarefas ativas (não concluídas e não executadas)
    const hasActiveTasks = userTasks.some(t => !isTerminalStatus(t.status));

    // Se não há tarefas ativas e há pelo menos uma tarefa
    if (!hasActiveTasks && userTasks.length > 0) {
      const today = new Date().toDateString();
      const key = `${today}-${user?.id || 'all'}-${selectedUserId}`;

      // Só mostrar se ainda não foi mostrado hoje
      if (!congratulationsShownRef.current.has(key)) {
        setShowCongratulations(true);
        congratulationsShownRef.current.add(key);

        // Enviar notificação do navegador
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
          try {
            const notification = new window.Notification('🎉 Parabéns!', {
              body: 'Todas as suas tarefas foram concluídas! Excelente trabalho!',
              icon: '/favicon.ico',
              tag: 'all-tasks-completed',
              requireInteraction: false,
            });
            setTimeout(() => notification.close(), 5000);
          } catch (error) {
            console.error('Erro ao enviar notificação:', error);
          }
        }
      }
    } else {
      setShowCongratulations(false);
    }
  }, [tasks, loading, isManager, selectedUserId, user?.id, isTerminalStatus]);

  // Agrupar por role e depois por usuário (se gestor)
  let groupedTasks: Array<{ roleLabel: string; role: string | null; users: Array<{ userLabel: string; userId: string | null; tasks: Task[] }> }> = [];

  if (isManager) {
    // Agrupar primeiro por role, depois por usuário
    const groupedByRole: Record<string, Record<string, Task[]>> = {};
    for (const t of filteredActiveTasks) {
      const userId = t.assignedToId?.toString() || 'unassigned';
      const user = employees.find(e => e.id === t.assignedToId);
      const userName = user?.name || 'Sem atribuição';
      const role = user?.role || 'unassigned';
      
      if (!groupedByRole[role]) groupedByRole[role] = {};
      const userKey = `${userId}|${userName}`;
      if (!groupedByRole[role][userKey]) groupedByRole[role][userKey] = [];
      groupedByRole[role][userKey].push(t);
    }

    // Converter para array e ordenar
    for (const [role, usersGroup] of Object.entries(groupedByRole)) {
      const roleLabel = role !== 'unassigned' ? getRoleLabel(role as any) : 'Sem atribuição';
      const users: Array<{ userLabel: string; userId: string | null; tasks: Task[] }> = [];
      
      for (const [userKey, userTasks] of Object.entries(usersGroup)) {
        const [userId, userName] = userKey.split('|');
        users.push({ userLabel: userName, userId, tasks: userTasks });
      }
      
      // Ordenar usuários: primeiro os com tarefas atrasadas, depois por nome
      users.sort((a, b) => {
        const aHasOverdue = a.tasks.some(t => isTaskOverdue(t));
        const bHasOverdue = b.tasks.some(t => isTaskOverdue(t));
        if (aHasOverdue && !bHasOverdue) return -1;
        if (!aHasOverdue && bHasOverdue) return 1;
        return a.userLabel.localeCompare(b.userLabel);
      });
      
      groupedTasks.push({ roleLabel, role: role !== 'unassigned' ? role : null, users });
    }
    
    // Ordenar roles: primeiro as com tarefas atrasadas, depois por nome
    groupedTasks.sort((a, b) => {
      const aHasOverdue = a.users.some(u => u.tasks.some(t => isTaskOverdue(t)));
      const bHasOverdue = b.users.some(u => u.tasks.some(t => isTaskOverdue(t)));
      if (aHasOverdue && !bHasOverdue) return -1;
      if (!aHasOverdue && bHasOverdue) return 1;
      return a.roleLabel.localeCompare(b.roleLabel);
    });
  } else {
    // Para não-gestores, apenas lista as tarefas
    groupedTasks.push({ roleLabel: '', role: null, users: [{ userLabel: '', userId: null, tasks: filteredActiveTasks }] });
  }

  useEffect(() => {
    if (isManager) {
      userApi.getAll().then(setEmployees).catch(() => {});
    }
  }, [isManager]);

  useEffect(() => {
    if (!loading && tasks.length >= 0) {
      overdueApi.getActive()
        .then((alerts) => {
          setOverdueAlerts(Array.isArray(alerts) ? alerts : []);
        })
        .catch(() => {});
    }
  }, [loading, tasks.length]);

  useEffect(() => {
    if (!loading && tasks.length > 0) {
      checkOverdueTasks(tasks);
    }
  }, [tasks, loading, checkOverdueTasks, currentTime]); // Incluir currentTime para verificar quando horário muda

  useEffect(() => {
    if (!loading && overdueAlerts.length >= 0) {
      checkOverdueAlerts(overdueAlerts);
    }
  }, [overdueAlerts, loading, checkOverdueAlerts]);

  // Monitorar novas solicitações de acesso (apenas para admins)
  useEffect(() => {
    if (!loading && isManager) {
      // Verificar a cada 30 segundos
      const interval = setInterval(() => {
        checkPendingRequests();
      }, 30000);
      
      // Verificar imediatamente
      checkPendingRequests();
      
      return () => clearInterval(interval);
    }
  }, [loading, isManager, checkPendingRequests]);

  const handleSaveTask = async (taskData: {
    name: string;
    description: string;
    isRecurring: boolean;
    recurringDays?: string[];
    recurringDayOfMonth?: number;
    deadline?: string;
    timeLimit?: string;
    estimatedTime?: number;
    tutorialLink?: string;
    assignedToId?: number;
  }) => {
    setSaving(true);
    try {
      await addTask(taskData.name, 'pending', {
        description: taskData.description,
        isRecurring: taskData.isRecurring,
        recurringDays: taskData.recurringDays,
        recurringDayOfMonth: taskData.recurringDayOfMonth,
        deadline: taskData.deadline,
        timeLimit: taskData.timeLimit,
        estimatedTime: taskData.estimatedTime,
        tutorialLink: taskData.tutorialLink,
        assignedToId: taskData.assignedToId,
      });
    } catch (err) {
      console.error('Erro ao adicionar tarefa:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = useCallback(async (taskId: number, newStatus: TaskStatus) => {
    const config = statusConfig[newStatus];
    if (config?.requiresReason) {
      // Status que requer motivo: girar o card e pedir o motivo
      setFlippedCard(taskId);
      setFlippedCardStatus(newStatus);
      setFlippedCardReason('');
    } else {
      // Status que não requer motivo: mudar diretamente
      setFadingCards((prev) => new Set(prev).add(taskId));
      await changeStatus(taskId, newStatus);
      setTimeout(() => {
        setFadingCards((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 500);
    }
  }, [changeStatus]);

  const handleConfirmReason = useCallback(async (taskId: number) => {
    if (!flippedCardReason.trim() || !flippedCardStatus) return;
    
    setSavingReason(true);
    try {
      setFadingCards((prev) => new Set(prev).add(taskId));
      await changeStatus(taskId, flippedCardStatus, flippedCardReason.trim());
      setFlippedCard(null);
      setFlippedCardReason('');
      setFlippedCardStatus(null);
      setTimeout(() => {
        setFadingCards((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 500);
    } catch (err) {
      console.error('Erro ao salvar motivo:', err);
    } finally {
      setSavingReason(false);
    }
  }, [flippedCardReason, flippedCardStatus, changeStatus]);

  const handleCancelReason = useCallback(() => {
    setFlippedCard(null);
    setFlippedCardReason('');
    setFlippedCardStatus(null);
  }, []);

  const handleDelete = async (taskId: number) => {
    setDeleting(true);
    try {
      await deleteTask(taskId);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Função para transferir tarefa (apenas para adm)
  const handleTransfer = async (taskId: number, newUserId: number) => {
    try {
      await updateTask(taskId, { assignedToId: newUserId });
    } catch (err) {
      console.error('Erro ao transferir tarefa:', err);
      throw err;
    }
  };

  // Verificar se é administrador (role === 'adm')
  const isAdmin = user?.role === 'adm';

  const handleNavigate = (navPage: 'tasks' | 'users' | 'audit' | 'general' | 'all-tasks' | 'authorization-requests') => {
    setPage(navPage);
  };

  const getCurrentPage = (): 'tasks' | 'users' | 'audit' | 'general' | 'all-tasks' | 'authorization-requests' => {
    if (page === 'tasks') return 'tasks';
    if (page === 'general') return 'general';
    if (page === 'all-tasks') return 'all-tasks';
    if (page === 'users') return 'users';
    if (page === 'audit') return 'audit';
    if (page === 'authorization-requests') return 'authorization-requests';
    return 'tasks';
  };

  if (page === 'users') return <UserManagement onBack={() => setPage('tasks')} onNavigate={setPage} />;
  if (page === 'audit') return <AuditLogView onBack={() => setPage('tasks')} onNavigate={setPage} />;
  if (page === 'general') return <GeneralPage onBack={() => setPage('tasks')} onNavigate={setPage} />;
  if (page === 'all-tasks') return <AllTasksPage onBack={() => setPage('tasks')} onNavigate={setPage} />;
  if (page === 'authorization-requests') return <AuthorizationRequestsPage onBack={() => setPage('tasks')} onNavigate={setPage} />;

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentPage={getCurrentPage()}
        onNavigate={handleNavigate}
        tasks={tasks}
        isTerminalStatus={isTerminalStatus}
      />

      {error && (
        <div className="container mx-auto px-4 pt-4">
          <div
            className="relative flex items-center gap-3 p-4 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: `
                inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.15),
                0 0 20px rgba(255, 255, 255, 0.1),
                0 4px 16px 0 rgba(0, 0, 0, 0.08),
                0 1px 4px 0 rgba(0, 0, 0, 0.04),
                inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
              `,
              color: 'rgba(239, 68, 68, 0.85)',
            }}
          >
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'rgba(239, 68, 68, 0.7)' }} />
            <span className="text-sm flex-1">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="h-7 w-7 p-0 shrink-0"
              style={{
                color: 'rgba(239, 68, 68, 0.7)',
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {!loading && page === 'tasks' && (
        <div className="container mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-end">
                <Button
                  size="default"
                  className="gap-2 transition-all duration-200 hover:scale-[1.02]"
              onClick={() => setIsDialogOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.2) 100%)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'rgba(15, 23, 42, 0.9)',
                    boxShadow: `
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                      inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                      inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                      0 2px 8px 0 rgba(0, 0, 0, 0.1),
                      0 1px 4px 0 rgba(0, 0, 0, 0.06)
                    `,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.3) 100%)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.2) 100%)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </Button>
                  </div>
                    </div>
                  )}

      <CreateTaskWizard
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveTask}
        employees={employees}
        isManager={isManager}
        saving={saving}
      />

      {loading && page === 'tasks' && (
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando tarefas...</p>
          </div>
        </div>
      )}

      {!loading && page === 'tasks' && (
        <div ref={filterSectionRef} className="container mx-auto px-4 pt-6 pb-2">
          {/* Filtro por usuário — sempre visível para gestores */}
          {isManager && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <Filter className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-semibold">Filtrar por usuário</span>
                </div>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger
                    className="w-full min-w-[220px] max-w-[280px]"
                    style={{
                      background: '#fff',
                      border: '1px solid rgb(203, 213, 225)',
                      color: '#1e293b',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedUserId !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-800"
                    onClick={() => setSelectedUserId('all')}
                  >
                    Limpar filtro
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Mensagem de congratulação quando todas as tarefas estão concluídas */}
          {showCongratulations && activeTasks.length === 0 && (
            <div className="mb-6 rounded-xl border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-green-800 mb-2">
                    🎉 Parabéns!
                  </h3>
                  <p className="text-lg text-green-700 mb-1">
                    Todas as suas tarefas foram concluídas!
                  </p>
                  <p className="text-sm text-green-600">
                    Excelente trabalho! Você está em dia com todas as suas responsabilidades.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCongratulations(false)}
                  className="flex-shrink-0 text-green-700 hover:text-green-900 hover:bg-green-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Estado vazio: sem tarefas ativas (nem com filtro) */}
          {activeTasks.length === 0 && !showCongratulations && (
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500/60" />
              <h3 className="text-xl font-bold text-foreground">
                Nenhuma tarefa ativa encontrada
              </h3>
              <p className="text-muted-foreground max-w-md">
                Parece que você não tem tarefas ativas no momento. Que tal criar uma nova?
              </p>
            </div>
          )}

          {/* Estado: filtro aplicado mas nenhum resultado */}
          {activeTasks.length > 0 && filteredActiveTasks.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
              <UserIcon className="w-12 h-12 text-slate-300" />
              <h3 className="text-xl font-bold text-foreground">
                Nenhuma tarefa para o usuário selecionado
              </h3>
              <p className="text-muted-foreground max-w-md">
                Escolha &quot;Todos os usuários&quot; no filtro acima ou outro usuário para ver as tarefas.
              </p>
            </div>
          )}

          {/* Lista de tarefas (quando há resultado do filtro) */}
          {filteredActiveTasks.length > 0 && (
          <>
          {/* Grupos por role e usuário */}
          {groupedTasks.map(({ roleLabel, role, users }) => {
            const roleKey = role || 'no-role';
            const isRoleCollapsed = isManager && roleLabel && collapsedRoles.has(roleKey);
            const taskCount = users.reduce((sum, u) => sum + u.tasks.length, 0);
            return (
            <div key={roleKey} className={isManager ? "mb-10" : ""}>
              {/* Setor — clique para expandir/recolher (apenas gestores) */}
              {isManager && roleLabel && (
                <button
                  type="button"
                  onClick={() => toggleRoleCollapsed(roleKey)}
                  className="w-full flex items-center gap-3 mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
                >
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Building2 className="h-5 w-5" />
                  </div>
                    <span className="font-bold text-slate-800">{roleLabel}</span>
                </div>
                  <div className="flex-1 h-px bg-slate-200 min-w-4" />
                  <span className="text-sm font-medium text-slate-600 shrink-0">
                    {taskCount} tarefa{taskCount !== 1 ? 's' : ''}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${isRoleCollapsed ? '' : 'rotate-180'}`}
                  />
                </button>
              )}

              {/* Grupos por usuário (oculto quando setor recolhido) */}
              {!isRoleCollapsed && users.map(({ userLabel, userId, tasks: userTasks }) => (
                <div key={userId || 'no-user'} className={isManager ? "mb-8 ml-4" : ""}>
                  {/* Separador de usuário (apenas para gestores) */}
                  {isManager && userLabel && (
                    <div className="flex items-center w-full gap-3 mb-6">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                        <UserIcon className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0 h-px bg-slate-200" />
                      <span className="px-4 py-1.5 shrink-0 text-base font-bold text-black bg-slate-100/80 rounded-md border border-slate-200/80">
                        {userLabel}
                      </span>
                      <div className="flex-1 min-w-0 h-px bg-slate-200" />
                      <span className="shrink-0 text-sm text-slate-600">
                        {userTasks.length} tarefa{userTasks.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Grid de cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-fr items-stretch">
                    {userTasks.map((task) => {
                  const config = statusConfig[task.status as TaskStatus];
                  const isFlipped = flippedCard === task.id;
                  const isFading = fadingCards.has(task.id);
                  if (!config) return null;
                  return (
                    <div
                      key={task.id}
                      className={`relative h-full min-h-0 flex ${isFading ? 'fade-out-pulse' : ''}`}
                      style={{ perspective: '1000px' }}
                    >
                  <div
                    className="relative w-full h-full min-h-0 flex flex-col"
                    style={{
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.6s ease-in-out',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* Frente do card */}
                    <Card
                      className="h-full min-h-0 flex flex-col transition-all duration-200 group backface-hidden overflow-hidden"
                      style={{
                        ...(isTaskOverdue(task)
                          ? {
                              background: '#fff',
                              border: '1px solid rgba(0, 0, 0, 0.08)',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
                            }
                          : {
                              background: '#fff',
                              border: '1px solid rgba(0, 0, 0, 0.08)',
                              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                            }),
                        transform: 'rotateY(0deg)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        if (!isFlipped) {
                          setHoveredCardId(task.id);
                          if (isTaskOverdue(task)) {
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)';
                            e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.1)';
                          } else {
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
                            e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.1)';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isFlipped) {
                          setHoveredCardId(null);
                          if (isTaskOverdue(task)) {
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)';
                            e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.08)';
                          } else {
                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.08)';
                            e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.08)';
                          }
                        }
                      }}
                    >
                      {/* Faixa ATRASADO só quando atrasado; sem tarja o card não tem “testona” */}
                      <div className="relative w-full flex-shrink-0 h-8">
                      {isTaskOverdue(task) && (
                          <div 
                            className="absolute inset-0 w-full flex items-center justify-center text-white font-bold tracking-wider text-xs pointer-events-none"
                            style={{ 
                              background: '#FF2C2C',
                              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                              letterSpacing: '0.15em',
                            }}
                          >
                            ATRASADO
                        </div>
                      )}
                      </div>

                      <CardHeader className="pb-2 pt-3 space-y-2">
                        {/* Linha 1: Badge de status + botões (evita tag em cima do título) */}
                        <div className="flex items-center justify-between gap-2 min-h-[1.75rem]">
                          <Badge
                            variant="outline"
                            className="text-sm shrink-0 font-bold"
                            style={{
                              background: `rgba(${getStatusColorRGB(task.status)}, 0.15)`,
                              border: `2px solid rgb(${getStatusColorRGB(task.status)})`,
                              color: `rgb(${getStatusColorRGB(task.status)})`,
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            {config.label}
                          </Badge>
                        {isManager && hoveredCardId === task.id && (
                          <div className="flex gap-1 transition-opacity duration-200">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-70 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTask(task);
                              }}
                              style={{
                                background: '#fff',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                color: '#374151',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f3f4f6';
                                e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fff';
                                e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.1)';
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {/* Botão de transferência (apenas para adm) */}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                              className="h-6 w-6 opacity-70 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferTask(task);
                                }}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  backdropFilter: 'blur(8px)',
                                  WebkitBackdropFilter: 'blur(8px)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: 'rgba(59, 130, 246, 0.7)',
                                  boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                    0 2px 4px 0 rgba(0, 0, 0, 0.1)
                                  `,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'rgba(59, 130, 246, 0.9)';
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'rgba(59, 130, 246, 0.7)';
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                                }}
                                title="Transferir tarefa"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-70 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(task);
                              }}
                              style={{
                                background: '#fff',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                color: '#dc2626',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fef2f2';
                                e.currentTarget.style.border = '1px solid rgba(220, 38, 38, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fff';
                                e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.1)';
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        </div>

                        {/* Título do card — linha 2, nunca sob a tag */}
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold line-clamp-2 flex-1 leading-snug">
                            {task.name}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0 flex flex-col space-y-2">
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
                            {task.description}
                          </p>
                        )}

                        {/* Info de atribuição */}
                        {task.assignedTo && isManager && (
                          <Badge
                            variant="secondary"
                            className="text-sm"
                            style={{
                              background: '#fff',
                              border: '1px solid rgba(0, 0, 0, 0.1)',
                              color: '#000',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            }}
                          >
                            <UserIcon className="w-3.5 h-3.5 shrink-0 inline mr-1 align-middle" />
                            {task.assignedTo.name}
                          </Badge>
                        )}

                        {/* Info de recorrência e horário limite */}
                        {(task.isRecurring || task.timeLimit) && (
                          <div className="flex flex-wrap gap-1">
                            {task.isRecurring && task.recurringDays && (
                              <Badge
                                variant="secondary"
                                className="text-sm gap-1"
                                style={{
                                  background: '#fff',
                                  border: '1px solid rgba(0, 0, 0, 0.1)',
                                  color: '#000',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                }}
                              >
                                <Repeat className="w-3.5 h-3.5 shrink-0 inline mr-1 align-middle" />
                                {formatRecurringDays(task.recurringDays)}
                              </Badge>
                            )}
                            {task.timeLimit && (
                              <Badge
                                variant="secondary"
                                className="text-sm gap-1"
                                style={{
                                  background: '#fff',
                                  border: '1px solid rgba(0, 0, 0, 0.1)',
                                  color: '#000',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                }}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                {task.timeLimit}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Espaçador flexível */}
                        <div className="flex-1 min-h-2" />

                        <div className="mt-2">
                          {!isTerminalStatus(task.status) && (
                            <Select
                              value={task.status}
                              onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                            >
                              <SelectTrigger
                                className="w-full"
                                style={{
                                  background: '#fff',
                                  border: '1px solid rgba(0, 0, 0, 0.1)',
                                  color: '#000',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                }}
                              >
                                <SelectValue placeholder="Alterar status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="in-progress">Em andamento</SelectItem>
                                <SelectItem value="waiting">Aguardando ação</SelectItem>
                                <SelectItem value="completed">Concluído</SelectItem>
                                <SelectItem value="not-executed">Não executado</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Verso do card - Formulário de motivo */}
                    <Card
                      className="h-full flex flex-col transition-all duration-200 group backface-hidden overflow-hidden absolute inset-0"
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-semibold line-clamp-2 flex-1">
                            {task.name}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            style={{
                              background: '#fff',
                              border: '1px solid rgba(0, 0, 0, 0.1)',
                              color: flippedCardStatus ? `rgb(${getStatusColorRGB(flippedCardStatus)})` : 'rgb(100, 116, 139)',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            }}
                          >
                            {flippedCardStatus ? statusConfig[flippedCardStatus]?.label : ''}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">
                            Informe o motivo {flippedCardStatus === 'not-executed' ? 'para não executar' : 'para aguardar ação'}:
                          </label>
                          <Input
                            placeholder="Digite o motivo..."
                            value={flippedCardReason}
                            onChange={(e) => setFlippedCardReason(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && flippedCardReason.trim()) {
                                handleConfirmReason(task.id);
                              }
                            }}
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2 mt-auto">
                          <Button
                            variant="outline"
                            onClick={handleCancelReason}
                            className="flex-1"
                            disabled={savingReason}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => handleConfirmReason(task.id)}
                            className="flex-1"
                            disabled={savingReason || !flippedCardReason.trim()}
                          >
                            {savingReason ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              'Confirmar'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
                })}
                  </div>
                </div>
              ))}
            </div>
            );
          })}
          </>
          )}
        </div>
      )}

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => { if (!open) setEditTask(null); }}
        onSave={updateTask}
        employees={employees}
      />

      {/* Dialog de transferência de tarefa (apenas para adm) */}
      {isAdmin && (
        <TransferTaskDialog
          task={transferTask}
          open={!!transferTask}
          onOpenChange={(open) => { if (!open) setTransferTask(null); }}
          onTransfer={handleTransfer}
          employees={employees}
        />
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir a tarefa <strong>"{deleteConfirm?.name}"</strong>?
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </Button>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;
