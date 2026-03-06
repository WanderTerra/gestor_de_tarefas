import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Loader2, AlertCircle, CalendarDays, Clock, CheckCircle2, Filter, Repeat,
  ArrowLeft, Eye, ClipboardList, Pencil, Trash2, ArrowRight,
} from 'lucide-react';
import { Task, statusConfig, TaskStatus } from '@/types/task';
import { taskApi, userApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { User, getRoleLabel } from '@/types/user';
import EditTaskDialog from '@/components/EditTaskDialog';
import TransferTaskDialog from '@/components/TransferTaskDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Page = 'tasks' | 'users' | 'audit' | 'general' | 'all-tasks' | 'authorization-requests';

interface GeneralPageProps {
  onBack: () => void;
  onNavigate?: (page: Page) => void;
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

const isTerminalStatus = (s: string) => s === 'completed' || s === 'not-executed';

function formatRecurringDays(days: string | null | undefined): string {
  if (!days) return '';
  const map: Record<string, string> = { dom: 'Dom', seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb' };
  return days.split(',').map((d) => map[d] || d).join(', ');
}

interface UserWithCount {
  id: number | null;
  name: string;
  role: string;
  taskCount: number;
}

const GeneralPage: React.FC<GeneralPageProps> = ({ onBack, onNavigate }) => {
  const { isManager } = useAuth();
  const [mode, setMode] = useState<'completed' | 'active'>('completed');
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
  const [transferTask, setTransferTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const handleNavigate = (navPage: Page) => {
    if (navPage === 'general') return;
    onNavigate?.(navPage) ?? onBack();
  };

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
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isManager) userApi.getAll().then(setEmployees).catch(() => {});
  }, [isManager]);

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
      fetchActive();
    }
  }, [mode, dateFrom, dateTo, fetchCompleted, fetchActive]);

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

  const tasksForSelectedUser = useMemo(() => {
    if (!selectedUser) return [];
    // Retornar TODAS as tarefas do usuário selecionado, sem filtro de status ou data
    return tasks.filter((t) => (t.assignedToId ?? null) === selectedUser.id);
  }, [tasks, selectedUser]);

  const tasksFilteredByDate = useMemo(() => {
    // No modo 'active' (Todas as tarefas), não aplicar filtro de data - mostrar todas
    if (mode === 'active') return tasksForSelectedUser;
    
    // No modo 'completed', aplicar filtro de data se as datas forem válidas
    if (!isValidBRDate(dateFrom) || !isValidBRDate(dateTo)) return tasksForSelectedUser;
    const from = new Date(brToISO(dateFrom));
    const to = new Date(brToISO(dateTo));
    to.setHours(23, 59, 59, 999);
    return tasksForSelectedUser.filter((t) => {
      const d = t.deadline ? new Date(t.deadline) : new Date(t.updatedAt);
      return d >= from && d <= to;
    });
  }, [mode, dateFrom, dateTo, tasksForSelectedUser]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    // No modo 'completed', agrupar por data de atualização (quando foi concluída)
    // No modo 'active' (Todas as tarefas), agrupar por data de criação para mostrar todas as tarefas criadas
    const dateKey = mode === 'completed' 
      ? (t: Task) => new Date(t.updatedAt).toLocaleDateString('pt-BR')
      : (t: Task) => new Date(t.createdAt).toLocaleDateString('pt-BR');
    for (const t of tasksFilteredByDate) {
      const key = dateKey(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime());
  }, [tasksFilteredByDate, mode]);

  const handleBackFromDetail = () => {
    setSelectedUser(null);
    setView('users');
  };

  // Função para atualizar tarefa
  const handleUpdateTask = async (taskId: number, data: any) => {
    try {
      await taskApi.update(taskId, data);
      // Recarregar tarefas após atualização
      if (mode === 'completed' && isValidBRDate(dateFrom) && isValidBRDate(dateTo)) {
        await fetchCompleted(dateFrom, dateTo);
      } else if (mode === 'active') {
        await fetchActive();
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
            <Badge variant="outline" className="font-bold" style={{ background: '#fff', border: '2px solid rgb(34, 197, 94)', color: 'rgb(22, 101, 52)', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)' }}>
              {mode === 'completed' ? 'Concluídas' : 'Ativas'}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm flex-1">{error}</span>
          </div>
        )}

        {view === 'users' && (
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
                {userListWithCounts.map((u) => (
                  <Card key={u.id ?? 'unassigned'} className="h-full flex flex-col" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold line-clamp-2 flex-1">{u.name}</CardTitle>
                        <Badge variant="outline" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#000' }}>
                          {u.role === 'unassigned' ? 'Sem atribuição' : getRoleLabel(u.role)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-3">
                      <p className="text-sm text-slate-600">{u.taskCount} tarefa{u.taskCount !== 1 ? 's' : ''}</p>
                      <div className="flex-1" />
                      <Button
                        onClick={() => { setSelectedUser(u); setView('detail'); }}
                        className="w-full gap-2"
                        style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#000' }}
                      >
                        <Eye className="w-4 h-4" />
                        Visualizar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && userListWithCounts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 text-lg">Nenhum usuário com tarefas {mode === 'completed' ? 'concluídas' : ''} no período.</p>
              </div>
            )}
          </>
        )}

        {view === 'detail' && selectedUser && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" size="sm" onClick={handleBackFromDetail} className="gap-2" style={{ background: '#fff', border: '1px solid rgba(0, 0, 0, 0.1)' }}>
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <h3 className="text-base font-bold text-slate-800">
                {mode === 'completed' ? 'Tarefas concluídas' : 'Todas as tarefas'} — {selectedUser.name}
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

            <div className="space-y-8">
              {mode === 'active' ? (
                // No modo 'active' (Todas as tarefas), exibir todas as tarefas sem agrupamento por data
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                  {tasksFilteredByDate.map((task) => {
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
                            <CardTitle className="text-base font-semibold line-clamp-2">{task.name}</CardTitle>
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
                            <div className="flex-1" />
                            {task.reason && mode === 'completed' && (
                              <div className={`p-2 rounded-md text-xs ${config.bgLight} ${config.textColor}`}>
                                <span className="font-semibold">Motivo: </span>{task.reason}
                              </div>
                            )}
                            {mode === 'completed' ? (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1 border-t border-border">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                <span>{formatDateTime(task.updatedAt)}</span>
                              </div>
                            ) : task.deadline && (
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
                              <CardTitle className="text-base font-semibold line-clamp-2">{task.name}</CardTitle>
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
            </div>

            {mode === 'active' && tasksFilteredByDate.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500">Nenhuma tarefa encontrada.</p>
              </div>
            )}

            {mode === 'completed' && groupedByDate.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500">Nenhuma tarefa neste período.</p>
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
