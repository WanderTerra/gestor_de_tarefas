import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Loader2, AlertCircle, CalendarDays, Clock, CheckCircle2, Filter, Repeat,
  Eye, Pencil, Trash2, ArrowRight, ClipboardList,
} from 'lucide-react';
import { Task, statusConfig, TaskStatus } from '@/types/task';
import { taskApi, userApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { User, getRoleLabel } from '@/types/user';
import EditTaskDialog from '@/components/EditTaskDialog';
import ViewTaskDialog from '@/components/ViewTaskDialog';
import TransferTaskDialog from '@/components/TransferTaskDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Page = 'tasks' | 'users' | 'audit' | 'general' | 'all-tasks' | 'authorization-requests';

interface GeneralPageProps {
  onBack: () => void;
  onNavigate?: (page: Page, userId?: number) => void;
}

const getStatusColorRGB = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    'pending': '250, 204, 21',
    'in-progress': '96, 165, 250',
    'waiting': '251, 146, 60',
    'completed': '74, 222, 128',
    'not-executed': '248, 113, 113',
  };
  return colorMap[status] || '148, 163, 184';
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function todayBR(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function lastWeekBR(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7); // 7 dias atrás
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function brToISO(brDate: string): string {
  const parts = brDate.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function isValidBRDate(brDate: string): boolean {
  const parts = brDate.split('/');
  if (parts.length !== 3) return false;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return false;
  const date = new Date(y, m - 1, d);
  return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y;
}

function formatRecurringDays(days: string | null | undefined): string {
  if (!days) return '';
  const map: Record<string, string> = { dom: 'Dom', seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb' };
  return days.split(',').map((d) => map[d] || d).join(', ');
}

function formatEstimatedTime(minutes: number | null | undefined): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}min`;
  }
}

interface UserWithCount {
  id: number | null;
  name: string;
  role: string;
  taskCount: number;
}

const GeneralPage: React.FC<GeneralPageProps> = ({ onBack, onNavigate }) => {
  const { isManager } = useAuth();
  // Esta página é apenas para managers (proteção no App.tsx)
  const [mode, setMode] = useState<'completed' | 'active' | 'pending' | 'overdue'>('completed');
  const [view, setView] = useState<'users' | 'detail'>('users');
  const [selectedUser, setSelectedUser] = useState<UserWithCount | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Por padrão, no modo 'completed' mostrar última semana, no modo 'active' não importa (não usa filtro)
  const [dateFrom, setDateFrom] = useState(() => lastWeekBR());
  const [dateTo, setDateTo] = useState(() => todayBR());
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [transferTask, setTransferTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const handleNavigate = useCallback((navPage: Page) => {
    if (navPage === 'general') {
      // Se já está na página geral, resetar para a view de usuários
      setView('users');
      setSelectedUser(null);
      return;
    }
    
    // IMPORTANTE: chamar onNavigate PRIMEIRO, antes de resetar o estado
    // Isso garante que a navegação aconteça imediatamente
    if (onNavigate) {
      onNavigate(navPage);
    } else {
      onBack();
    }
    
    // Resetar estado interno após iniciar a navegação
    setView('users');
    setSelectedUser(null);
  }, [onNavigate, onBack]);

  const fetchCompleted = useCallback(async (fromBR: string, toBR: string) => {
    const fromISO = brToISO(fromBR);
    const toISO = brToISO(toBR);
    if (!fromISO || !toISO || !isValidBRDate(fromBR) || !isValidBRDate(toBR)) return;
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getCompleted({ from: fromISO, to: toISO });
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas concluídas');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getAll();
      // Mostrar TODAS as tarefas quando o modo for 'active' (Todas as tarefas)
      // Não filtrar por status - incluir todas: pending, in-progress, waiting, completed, not-executed
      // Garantir que tarefas concluídas sejam incluídas
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getAll();
      // Filtrar apenas tarefas pendentes: status === 'pending'
      const pendingTasks = data.filter((task) => task.status === 'pending');
      setTasks(pendingTasks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas pendentes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOverdue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getAll();
      // Filtrar apenas tarefas atrasadas: isOverdue === true e status não é 'completed' ou 'not-executed'
      const overdueTasks = data.filter(
        (task) => task.isOverdue && task.status !== 'completed' && task.status !== 'not-executed'
      );
      setTasks(overdueTasks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas atrasadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carregar lista de funcionários (apenas managers acessam esta página)
    userApi.getAll().then(setEmployees).catch(() => {});
  }, []);

  // Quando mudar para o modo 'completed', atualizar datas para última semana
  useEffect(() => {
    if (mode === 'completed') {
      setDateFrom(lastWeekBR());
      setDateTo(todayBR());
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'completed' && isValidBRDate(dateFrom) && isValidBRDate(dateTo)) {
      fetchCompleted(dateFrom, dateTo);
    } else if (mode === 'active') {
      // Quando muda para 'active', garantir que busca todas as tarefas
      // Isso inclui tarefas concluídas que podem ter sido resetadas
      // Não depender de dateFrom/dateTo para evitar re-renders desnecessários
      fetchActive();
    } else if (mode === 'pending') {
      // Quando muda para 'pending', buscar apenas tarefas pendentes
      fetchPending();
    } else if (mode === 'overdue') {
      // Quando muda para 'overdue', buscar apenas tarefas atrasadas
      fetchOverdue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, fetchCompleted, fetchActive, fetchPending, fetchOverdue]);
  
  // Buscar tarefas concluídas quando as datas mudarem (apenas no modo completed)
  useEffect(() => {
    if (mode === 'completed' && isValidBRDate(dateFrom) && isValidBRDate(dateTo)) {
      fetchCompleted(dateFrom, dateTo);
    }
  }, [dateFrom, dateTo, mode, fetchCompleted]);

  const userListWithCounts = useMemo((): UserWithCount[] => {
    const byUser = new Map<number | null, Task[]>();
    for (const t of tasks) {
      const id = t.assignedToId ?? null;
      if (!byUser.has(id)) byUser.set(id, []);
      byUser.get(id)!.push(t);
    }
    const list: UserWithCount[] = [];
    for (const [id, userTasks] of byUser) {
      const user = id !== null ? employees.find((e) => e.id === id) : null;
      list.push({
        id,
        name: user?.name ?? (id === null ? 'Sem atribuição' : `Usuário #${id}`),
        role: user?.role ?? 'unassigned',
        taskCount: userTasks.length,
      });
    }
    list.sort((a, b) => b.taskCount - a.taskCount);
    return list;
  }, [tasks, employees]);

  // Atualizar selectedUser quando as tarefas mudarem, mantendo a seleção se o usuário ainda existir
  useEffect(() => {
    if (selectedUser && view === 'detail') {
      // Verificar se o usuário selecionado ainda existe na nova lista de usuários
      const updatedUser = userListWithCounts.find((u) => u.id === selectedUser.id);
      if (updatedUser) {
        // Atualizar o selectedUser com os novos dados (especialmente taskCount)
        setSelectedUser(updatedUser);
      }
      // Se o usuário não existir mais (não tem tarefas no novo modo), manter a seleção mesmo assim
      // para que o admin possa ver que não há tarefas para esse usuário
    }
  }, [tasks, userListWithCounts, selectedUser, view]);

  const tasksForSelectedUser = useMemo(() => {
    if (!selectedUser) return [];
    // Retornar TODAS as tarefas do usuário selecionado, sem filtro de status ou data
    return tasks.filter((t) => (t.assignedToId ?? null) === selectedUser.id);
  }, [tasks, selectedUser]);

  // Obter o nome real do usuário selecionado (atualizado quando employees carregar)
  const selectedUserName = useMemo(() => {
    if (!selectedUser) return '';
    if (selectedUser.id === null) return 'Sem atribuição';
    // Buscar na lista de employees
    const userFromList = employees.find((e) => e.id === selectedUser.id);
    return userFromList?.name ?? selectedUser.name;
  }, [selectedUser, employees]);

  const tasksFilteredByDate = useMemo(() => {
    // No modo 'active' (Todas as tarefas), não aplicar filtro de data - mostrar todas
    // Incluir todas as tarefas, independente do status (pending, completed, etc.)
    if (mode === 'active') {
      return tasksForSelectedUser;
    }
    
    // No modo 'pending' (Tarefas pendentes), não aplicar filtro de data - mostrar todas as pendentes
    if (mode === 'pending') {
      return tasksForSelectedUser;
    }
    
    // No modo 'overdue' (Tarefas atrasadas), não aplicar filtro de data - mostrar todas as atrasadas
    if (mode === 'overdue') {
      return tasksForSelectedUser;
    }
    
    // No modo 'completed', aplicar filtro de data se as datas forem válidas
    if (!isValidBRDate(dateFrom) || !isValidBRDate(dateTo)) return tasksForSelectedUser;
    const fromParts = dateFrom.split('/');
    const toParts = dateTo.split('/');
    const from = new Date(parseInt(fromParts[2]), parseInt(fromParts[1]) - 1, parseInt(fromParts[0]), 0, 0, 0, 0);
    const to = new Date(parseInt(toParts[2]), parseInt(toParts[1]) - 1, parseInt(toParts[0]), 23, 59, 59, 999);
    return tasksForSelectedUser.filter((t) => {
      // Para tarefas concluídas, usar updatedAt (data de conclusão)
      // Para outras, usar deadline se existir, senão updatedAt
      const d = t.status === 'completed' 
        ? new Date(t.updatedAt) 
        : (t.deadline ? new Date(t.deadline) : new Date(t.updatedAt));
      return d >= from && d <= to;
    });
  }, [mode, dateFrom, dateTo, tasksForSelectedUser]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    // No modo 'completed', agrupar por data de atualização (quando foi concluída)
    // No modo 'active' (Todas as tarefas), agrupar por data de criação para mostrar todas as tarefas criadas
    // No modo 'pending' (Tarefas pendentes), agrupar por data de deadline ou criação
    // No modo 'overdue' (Tarefas atrasadas), agrupar por data de deadline ou criação
    const dateKey = mode === 'completed' 
      ? (t: Task) => new Date(t.updatedAt).toLocaleDateString('pt-BR')
      : mode === 'pending' || mode === 'overdue'
      ? (t: Task) => (t.deadline ? new Date(t.deadline).toLocaleDateString('pt-BR') : new Date(t.createdAt).toLocaleDateString('pt-BR'))
      : (t: Task) => new Date(t.createdAt).toLocaleDateString('pt-BR');
    for (const t of tasksFilteredByDate) {
      const key = dateKey(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime());
  }, [tasksFilteredByDate, mode]);

  // Função para atualizar tarefa
  const handleUpdateTutorialLink = async (taskId: number, data: { tutorialLink?: string | null }) => {
    try {
      await taskApi.update(taskId, data);
      // Recarregar tarefas
      if (mode === 'completed') {
        const fromISO = brToISO(dateFrom);
        const toISO = brToISO(dateTo);
        if (fromISO && toISO) {
          const completed = await taskApi.getCompleted({ from: fromISO, to: toISO });
          setTasks(completed);
        }
      } else if (mode === 'pending') {
        const all = await taskApi.getAll();
        const pendingTasks = all.filter((task) => task.status === 'pending');
        setTasks(pendingTasks);
      } else if (mode === 'overdue') {
        const all = await taskApi.getAll();
        const overdueTasks = all.filter(
          (task) => task.isOverdue && task.status !== 'completed' && task.status !== 'not-executed'
        );
        setTasks(overdueTasks);
      } else {
        const all = await taskApi.getAll();
        setTasks(all);
      }
    } catch (error) {
      console.error('Erro ao atualizar link do tutorial:', error);
      throw error;
    }
  };

  const handleUpdateTask = async (taskId: number, data: any) => {
    try {
      await taskApi.update(taskId, data);
      // Recarregar tarefas após atualização
      if (mode === 'completed' && isValidBRDate(dateFrom) && isValidBRDate(dateTo)) {
        await fetchCompleted(dateFrom, dateTo);
      } else if (mode === 'active') {
        await fetchActive();
      } else if (mode === 'pending') {
        await fetchPending();
      } else if (mode === 'overdue') {
        await fetchOverdue();
      }
      setEditTask(null);
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
      throw err;
    }
  };

  // Função para transferir tarefa
  const handleTransfer = async (taskId: number, newUserId: number) => {
    try {
      await taskApi.update(taskId, { assignedToId: newUserId });
      // Recarregar tarefas após transferência
      if (mode === 'completed' && isValidBRDate(dateFrom) && isValidBRDate(dateTo)) {
        await fetchCompleted(dateFrom, dateTo);
      } else if (mode === 'active') {
        await fetchActive();
      } else if (mode === 'pending') {
        await fetchPending();
      } else if (mode === 'overdue') {
        await fetchOverdue();
      }
      setTransferTask(null);
    } catch (err) {
      console.error('Erro ao transferir tarefa:', err);
      throw err;
    }
  };

  // Função para deletar tarefa
  const handleDeleteTask = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      await taskApi.delete(deleteConfirm.id);
      // Recarregar tarefas após deleção
      if (mode === 'completed' && isValidBRDate(dateFrom) && isValidBRDate(dateTo)) {
        await fetchCompleted(dateFrom, dateTo);
      } else if (mode === 'active') {
        await fetchActive();
      } else if (mode === 'pending') {
        await fetchPending();
      } else if (mode === 'overdue') {
        await fetchOverdue();
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar tarefa');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="general" onNavigate={handleNavigate} tasks={[]} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between pt-4 mb-6">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-foreground">Geral</h2>
            <Badge 
              variant="outline" 
              className="font-bold" 
              style={{ 
                background: '#fff', 
                border: mode === 'completed' 
                  ? '2px solid rgb(34, 197, 94)' 
                  : mode === 'active' 
                  ? '2px solid rgb(59, 130, 246)' 
                  : mode === 'pending'
                  ? '2px solid rgb(234, 179, 8)' 
                  : '2px solid rgb(220, 38, 38)', 
                color: mode === 'completed' 
                  ? 'rgb(22, 101, 52)' 
                  : mode === 'active' 
                  ? 'rgb(30, 64, 175)' 
                  : mode === 'pending'
                  ? 'rgb(161, 98, 7)' 
                  : 'rgb(153, 27, 27)', 
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)' 
              }}
            >
              {mode === 'completed' ? 'Concluídas' : mode === 'active' ? 'Ativas' : mode === 'pending' ? 'Pendentes' : 'Atrasadas'}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm flex-1">{error}</span>
          </div>
        )}

        {view === 'users' && isManager && (
          <>
            <Card className="mb-6" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-medium text-slate-600">Exibir:</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setMode('completed')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'completed' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      Tarefas concluídas
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('active')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'active' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      Todas as tarefas
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('pending')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'pending' ? 'bg-yellow-500 text-white' : 'bg-white text-slate-600 hover:bg-yellow-50 hover:text-yellow-600'}`}
                    >
                      Tarefas pendentes
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('overdue')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'overdue' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600'}`}
                    >
                      Tarefas atrasadas
                    </button>
                  </div>
                  {mode === 'completed' && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-500 shrink-0" />
                      <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="De" className="w-28" />
                      <span className="text-slate-400">até</span>
                      <DatePicker value={dateTo} onChange={setDateTo} placeholder="Até" className="w-28" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {loading && (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
                <p className="text-slate-500">Carregando...</p>
              </div>
            )}

            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {userListWithCounts.map((u) => {
                  // Obter cor RGB baseada no modo atual
                  const getModeColorRGB = (): string => {
                    switch (mode) {
                      case 'completed':
                        return '74, 222, 128'; // verde
                      case 'active':
                        return '96, 165, 250'; // azul
                      case 'pending':
                        return '250, 204, 21'; // amarelo
                      case 'overdue':
                        return '248, 113, 113'; // vermelho
                      default:
                        return '148, 163, 184'; // cinza
                    }
                  };
                  const modeColorRGB = getModeColorRGB();
                  
                  return (
                  <Card
                    key={u.id ?? 'unassigned'}
                    className="h-full flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
                    style={{ 
                      background: '#fff', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: `0 4px 12px rgba(${modeColorRGB}, 0.3), 0 2px 4px rgba(${modeColorRGB}, 0.2), 0 1px 3px rgba(0,0,0,0.06)`
                    }}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold leading-tight line-clamp-2 flex-1 text-slate-800">
                          {u.name}
                        </CardTitle>
                        <Badge variant="outline" className="shrink-0 text-xs" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                          {u.role === 'unassigned' ? 'Sem atribuição' : getRoleLabel(u.role)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pt-0 px-4 pb-4">
                      <p className="text-sm text-slate-600 mb-3">{u.taskCount} tarefa{u.taskCount !== 1 ? 's' : ''}</p>
                      <div className="flex-1 min-h-2" />
                      <Button
                        onClick={() => { setSelectedUser(u); setView('detail'); }}
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      >
                        <Eye className="w-4 h-4" />
                        Visualizar
                      </Button>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}

            {!loading && userListWithCounts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 text-lg">
                  {mode === 'completed' 
                    ? 'Nenhum usuário com tarefas concluídas no período.' 
                    : mode === 'pending'
                    ? 'Nenhum usuário com tarefas pendentes.'
                    : mode === 'overdue'
                    ? 'Nenhum usuário com tarefas atrasadas.'
                    : 'Nenhum usuário com tarefas.'}
                </p>
              </div>
            )}
          </>
        )}

        {view === 'detail' && selectedUser && (
          <>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600">Exibir:</span>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMode('completed')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'completed' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    Tarefas concluídas
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('active')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'active' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    Todas as tarefas
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('pending')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'pending' ? 'bg-yellow-500 text-white' : 'bg-white text-slate-600 hover:bg-yellow-50 hover:text-yellow-600'}`}
                  >
                    Tarefas pendentes
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('overdue')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'overdue' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600'}`}
                  >
                    Tarefas atrasadas
                  </button>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {selectedUserName}
              </h3>
            </div>

            {/* Mostrar filtro de data apenas no modo 'completed' */}
            {mode === 'completed' && (
              <Card className="mb-6" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Filter className="w-4 h-4" />
                      Filtro de datas
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">De</label>
                      <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="dd/mm/aaaa" className="w-32" />
                      <label className="text-sm text-slate-600">Até</label>
                      <DatePicker value={dateTo} onChange={setDateTo} placeholder="dd/mm/aaaa" className="w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
                <p className="text-slate-500">Carregando...</p>
              </div>
            )}

            {!loading && (
              <div className="space-y-8">
                {mode === 'active' || mode === 'pending' || mode === 'overdue' ? (
                // No modo 'active' (Todas as tarefas), 'pending' (Tarefas pendentes) ou 'overdue' (Tarefas atrasadas), exibir todas as tarefas sem agrupamento por data
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                  {tasksFilteredByDate.map((task) => {
                      const config = statusConfig[task.status];
                      return (
                        <Card 
                          key={`task-${task.id}-${mode}`}
                          data-task-id={task.id}
                          data-task-status={task.status}
                          className="h-full flex flex-col transition-all duration-200 group" 
                          style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
                          onMouseEnter={() => setHoveredCardId(task.id)}
                          onMouseLeave={() => setHoveredCardId(null)}
                        >
                          <CardHeader className="pb-3 relative pt-8">
                            <div className="absolute top-0 left-6 z-10">
                              <Badge variant="outline" className="text-sm font-bold shrink-0" style={{ background: `rgba(${getStatusColorRGB(task.status)}, 0.15)`, border: `2px solid rgb(${getStatusColorRGB(task.status)})`, color: `rgb(${getStatusColorRGB(task.status)})`, boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)' }}>
                                {config.label}
                              </Badge>
                            </div>
                            {/* Botões no canto superior direito (apenas para managers) */}
                            {isManager && hoveredCardId === task.id && (
                              <div className="absolute top-0 right-0 flex gap-1 z-10 transition-opacity duration-200">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-70 hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditTask(task);
                                  }}
                                  style={{
                                    background: '#fff',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-70 hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTransferTask(task);
                                  }}
                                  style={{
                                    background: '#fff',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    color: 'rgba(59, 130, 246, 0.7)',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                  }}
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-70 hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(task);
                                  }}
                                  style={{
                                    background: '#fff',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    color: 'rgb(239, 68, 68)',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle 
                                className="text-base font-semibold line-clamp-2 flex-1 cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setViewTask(task)}
                                title="Clique para ver detalhes"
                              >
                                {task.name}
                              </CardTitle>
                              {/* Botão de visualização - visível para todos */}
                              {hoveredCardId === task.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-70 hover:opacity-100 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewTask(task);
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
                                  title="Ver detalhes"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col space-y-3">
                            {task.description && <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
                            {(task.isRecurring || task.timeLimit) && (
                              <div className="flex flex-wrap gap-1.5">
                                {task.isRecurring && task.recurringDays && (
                                  <Badge variant="secondary" className="text-xs" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#000' }}>
                                    <Repeat className="w-3 h-3 inline mr-1" />
                                    {formatRecurringDays(task.recurringDays)}
                                  </Badge>
                                )}
                                {task.timeLimit && (
                                  <Badge variant="secondary" className="text-xs" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#000' }}>
                                    <Clock className="w-3 h-3" />
                                    {task.timeLimit}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {task.estimatedTime && (
                              <Badge variant="secondary" className="text-xs" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#000' }}>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatEstimatedTime(task.estimatedTime)}
                              </Badge>
                            )}
                            <div className="flex-1" />
                            {task.deadline && (
                              <div className="text-sm text-muted-foreground pt-1 border-t border-border">
                                Prazo: {new Date(task.deadline).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
              ) : (
                // No modo 'completed' (Tarefas concluídas), manter agrupamento por data
                groupedByDate.map(([dateLabel, dateTasks]) => (
                  <div key={dateLabel}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {dateLabel}
                      </div>
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-500">{dateTasks.length} tarefa{dateTasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                      {dateTasks.map((task) => {
                        const config = statusConfig[task.status];
                        return (
                          <Card 
                            key={task.id} 
                            className="h-full flex flex-col transition-all duration-200 group" 
                            style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
                            onMouseEnter={() => setHoveredCardId(task.id)}
                            onMouseLeave={() => setHoveredCardId(null)}
                          >
                            <CardHeader className="pb-3 relative pt-8">
                              <div className="absolute top-0 left-6 z-10">
                                <Badge variant="outline" className="text-sm font-bold shrink-0" style={{ background: `rgba(${getStatusColorRGB(task.status)}, 0.15)`, border: `2px solid rgb(${getStatusColorRGB(task.status)})`, color: `rgb(${getStatusColorRGB(task.status)})`, boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)' }}>
                                  {config.label}
                                </Badge>
                              </div>
                              {/* Botões no canto superior direito (apenas para managers) */}
                              {isManager && hoveredCardId === task.id && (
                                <div className="absolute top-0 right-0 flex gap-1 z-10 transition-opacity duration-200">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-70 hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditTask(task);
                                    }}
                                    style={{
                                      background: '#fff',
                                      border: '1px solid rgba(0, 0, 0, 0.1)',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-70 hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransferTask(task);
                                    }}
                                    style={{
                                      background: '#fff',
                                      border: '1px solid rgba(0, 0, 0, 0.1)',
                                      color: 'rgba(59, 130, 246, 0.7)',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                    }}
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-70 hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm(task);
                                    }}
                                    style={{
                                      background: '#fff',
                                      border: '1px solid rgba(0, 0, 0, 0.1)',
                                      color: 'rgb(239, 68, 68)',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                              <div className="flex items-start justify-between gap-2">
                              <CardTitle 
                                className="text-base font-semibold line-clamp-2 flex-1 cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setViewTask(task)}
                                title="Clique para ver detalhes"
                              >
                                {task.name}
                              </CardTitle>
                              {/* Botão de visualização - visível para todos */}
                              {hoveredCardId === task.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-70 hover:opacity-100 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewTask(task);
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
                                  title="Ver detalhes"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col space-y-3">
                              {task.description && <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
                              {(task.isRecurring || task.timeLimit) && (
                                <div className="flex flex-wrap gap-1.5">
                                  {task.isRecurring && task.recurringDays && (
                                    <Badge variant="secondary" className="text-xs" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#000' }}>
                                      <Repeat className="w-3 h-3 inline mr-1" />
                                      {formatRecurringDays(task.recurringDays)}
                                    </Badge>
                                  )}
                                  {task.timeLimit && (
                                    <Badge variant="secondary" className="text-xs" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#000' }}>
                                      <Clock className="w-3 h-3" />
                                      {task.timeLimit}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {task.estimatedTime && (
                                <Badge variant="secondary" className="text-xs" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#000' }}>
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  {formatEstimatedTime(task.estimatedTime)}
                                </Badge>
                              )}
                              <div className="flex-1" />
                              {task.reason && (
                                <div className={`p-2 rounded-md text-xs ${config.bgLight} ${config.textColor}`}>
                                  <span className="font-semibold">Motivo: </span>{task.reason}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1 border-t border-border">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                <span>{formatDateTime(task.updatedAt)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

                {mode === 'active' && tasksFilteredByDate.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-slate-500">Nenhuma tarefa encontrada.</p>
                  </div>
                )}

                {mode === 'pending' && tasksFilteredByDate.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-slate-500">Nenhuma tarefa pendente encontrada.</p>
                  </div>
                )}

                {mode === 'overdue' && tasksFilteredByDate.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-slate-500">Nenhuma tarefa atrasada encontrada.</p>
                  </div>
                )}

                {mode === 'completed' && groupedByDate.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-slate-500">Nenhuma tarefa neste período.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de edição */}
      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => { if (!open) setEditTask(null); }}
        onSave={handleUpdateTask}
        employees={employees}
      />

      {/* Dialog de visualização */}
      <ViewTaskDialog
        task={viewTask}
        open={!!viewTask}
        onOpenChange={(open) => { if (!open) setViewTask(null); }}
        onUpdateTutorialLink={handleUpdateTutorialLink}
        canEditTutorialLink={true}
      />

      {/* Dialog de transferência */}
      {isManager && (
        <TransferTaskDialog
          task={transferTask}
          open={!!transferTask}
          onOpenChange={(open) => { if (!open) setTransferTask(null); }}
          onTransfer={handleTransfer}
          employees={employees}
        />
      )}

      {/* Dialog de confirmação de deleção */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir a tarefa <strong>"{deleteConfirm?.name}"</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDeleteTask}
                className="flex-1"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeneralPage;
