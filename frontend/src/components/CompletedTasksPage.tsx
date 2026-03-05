import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, AlertCircle, Search, CalendarDays, Clock, CheckCircle2, Pencil, Trash2, User as UserIcon, Filter,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, statusConfig, TaskStatus } from '@/types/task';
import { taskApi, userApi, UpdateTaskPayload } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import EditTaskDialog from '@/components/EditTaskDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, getRoleLabel } from '@/types/user';

interface CompletedTasksPageProps {
  onBack: () => void;
  onNavigate?: (page: 'tasks' | 'completed' | 'users' | 'audit' | 'authorization-requests') => void;
}

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

/** Formata data ISO para "dd/mm/aaaa às HH:MM" */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

/** Retorna "dd/mm/aaaa" para hoje */
function todayBR(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Converte formato brasileiro (dd/mm/aaaa) para ISO (aaaa-mm-dd) */
function brToISO(brDate: string): string {
  const parts = brDate.split('/');
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
}

/** Aplica máscara de data brasileira (dd/mm/aaaa) */
function applyDateMask(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  }
}

/** Valida data brasileira (dd/mm/aaaa) */
function isValidBRDate(brDate: string): boolean {
  const parts = brDate.split('/');
  if (parts.length !== 3) return false;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
}

const CompletedTasksPage: React.FC<CompletedTasksPageProps> = ({ onBack, onNavigate }) => {
  const { isManager } = useAuth();
  
  const handleNavigate = (navPage: 'tasks' | 'users' | 'audit' | 'completed' | 'authorization-requests') => {
    if (navPage === 'completed') {
      // Já estamos na página de concluídas
      return;
    }
    if (onNavigate) {
      onNavigate(navPage);
    } else {
      onBack();
    }
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all'); // Filtro por usuário para gestores

  // Filtro de datas — default: hoje (formato brasileiro)
  const [dateFrom, setDateFrom] = useState(() => todayBR());
  const [dateTo, setDateTo] = useState(() => todayBR());

  const fetchCompleted = useCallback(async (fromBR: string, toBR: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Converte formato brasileiro para ISO antes de enviar à API
      const fromISO = brToISO(fromBR);
      const toISO = brToISO(toBR);
      
      if (!fromISO || !toISO || !isValidBRDate(fromBR) || !isValidBRDate(toBR)) {
        setError('Por favor, insira datas válidas no formato dd/mm/aaaa');
        setLoading(false);
        return;
      }
      
      const data = await taskApi.getCompleted({ from: fromISO, to: toISO });
      setTasks(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar tarefas concluídas';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar na montagem e quando filtro mudar
  useEffect(() => {
    // Só busca se ambas as datas são válidas
    if (isValidBRDate(dateFrom) && isValidBRDate(dateTo)) {
      fetchCompleted(dateFrom, dateTo);
    }
  }, [dateFrom, dateTo, fetchCompleted]);

  // Handler para buscar
  const handleSearch = () => {
    if (dateFrom && dateTo) {
      fetchCompleted(dateFrom, dateTo);
    } else {
      setError('Por favor, selecione ambas as datas');
    }
  };

  // Handler para botão "Hoje"
  const handleToday = () => {
    const today = todayBR();
    setDateFrom(today);
    setDateTo(today);
  };

  /** Converte string "seg,qua,sex" em labels legíveis */
  const formatRecurringDays = (days: string | null | undefined): string => {
    if (!days) return '';
    const dayMap: Record<string, string> = {
      dom: 'Dom', seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb',
    };
    return days.split(',').map(d => dayMap[d] || d).join(', ');
  };

  // Carregar funcionários para o dialog de edição
  useEffect(() => {
    if (isManager) {
      userApi.getAll().then(setEmployees).catch(() => {});
    }
  }, [isManager]);

  // Função para atualizar tarefa
  const handleUpdateTask = async (taskId: number, data: UpdateTaskPayload) => {
    try {
      const updated = await taskApi.update(taskId, data);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      setEditTask(null);
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa');
    }
  };

  // Função para deletar tarefa
  const handleDeleteTask = async () => {
    if (!deleteConfirm) return;
    
    try {
      setDeleting(true);
      await taskApi.delete(deleteConfirm.id);
      setTasks(prev => prev.filter(t => t.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar tarefa');
    } finally {
      setDeleting(false);
    }
  };

  // Filtrar tarefas por usuário (se gestor e filtro selecionado)
  const filteredTasks = isManager && selectedUserId !== 'all'
    ? tasks.filter(t => t.assignedToId === parseInt(selectedUserId))
    : tasks;

  // Agrupar por role, depois por usuário, e depois por data
  let groupedData: Array<{ roleLabel: string; role: string | null; users: Array<{ userLabel: string; userId: string | null; dateGroups: Array<[string, Task[]]> }> }> = [];

  if (isManager) {
    // Agrupar primeiro por role, depois por usuário
    const groupedByRole: Record<string, Record<string, Task[]>> = {};
    for (const t of filteredTasks) {
      const userId = t.assignedToId?.toString() || 'unassigned';
      const user = employees.find(e => e.id === t.assignedToId);
      const userName = user?.name || 'Sem atribuição';
      const role = user?.role || 'unassigned';
      
      if (!groupedByRole[role]) groupedByRole[role] = {};
      const userKey = `${userId}|${userName}`;
      if (!groupedByRole[role][userKey]) groupedByRole[role][userKey] = [];
      groupedByRole[role][userKey].push(t);
    }

    // Para cada role e usuário, agrupar por data
    for (const [role, usersGroup] of Object.entries(groupedByRole)) {
      const roleLabel = role !== 'unassigned' ? getRoleLabel(role as any) : 'Sem atribuição';
      const users: Array<{ userLabel: string; userId: string | null; dateGroups: Array<[string, Task[]]> }> = [];
      
      for (const [userKey, userTasks] of Object.entries(usersGroup)) {
        const [userId, userName] = userKey.split('|');
        const groupedByDate: Record<string, Task[]> = {};
        for (const t of userTasks) {
          const dateKey = new Date(t.updatedAt).toLocaleDateString('pt-BR');
          if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
          groupedByDate[dateKey].push(t);
        }
        const dateGroups = Object.entries(groupedByDate).sort(([a], [b]) => {
          return new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime();
        });
        users.push({ userLabel: userName, userId, dateGroups });
      }
      
      // Ordenar usuários: primeiro os com tarefas atrasadas, depois por nome
      users.sort((a, b) => {
        const aHasOverdue = a.dateGroups.some(([, tasks]) => tasks.some(t => t.isOverdue));
        const bHasOverdue = b.dateGroups.some(([, tasks]) => tasks.some(t => t.isOverdue));
        if (aHasOverdue && !bHasOverdue) return -1;
        if (!aHasOverdue && bHasOverdue) return 1;
        return a.userLabel.localeCompare(b.userLabel);
      });
      
      groupedData.push({ roleLabel, role: role !== 'unassigned' ? role : null, users });
    }
    
    // Ordenar roles: primeiro as com tarefas atrasadas, depois por nome
    groupedData.sort((a, b) => {
      const aHasOverdue = a.users.some(u => u.dateGroups.some(([, tasks]) => tasks.some(t => t.isOverdue)));
      const bHasOverdue = b.users.some(u => u.dateGroups.some(([, tasks]) => tasks.some(t => t.isOverdue)));
      if (aHasOverdue && !bHasOverdue) return -1;
      if (!aHasOverdue && bHasOverdue) return 1;
      return a.roleLabel.localeCompare(b.roleLabel);
    });
  } else {
    // Para não-gestores, apenas agrupar por data
    const groupedByDate: Record<string, Task[]> = {};
    for (const t of filteredTasks) {
      const dateKey = new Date(t.updatedAt).toLocaleDateString('pt-BR');
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
      groupedByDate[dateKey].push(t);
    }
    const dateGroups = Object.entries(groupedByDate).sort(([a], [b]) => {
      return new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime();
    });
    groupedData.push({ roleLabel: '', role: null, users: [{ userLabel: '', userId: null, dateGroups }] });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentPage="completed"
        onNavigate={handleNavigate}
        tasks={tasks}
      />

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-8">
        {/* Título da página */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-foreground">
              Tarefas Concluídas
            </h2>
          </div>
            <Badge 
              variant="outline"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(22, 101, 52, 0.6)',
                boxShadow: `
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                  inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                  inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                  0 2px 8px 0 rgba(0, 0, 0, 0.1),
                  0 1px 4px 0 rgba(0, 0, 0, 0.06),
                  0 0 8px 0 rgba(22, 101, 52, 0.15)
                `,
              }}
            >
              {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} concluída{tasks.length !== 1 ? 's' : ''}
            </Badge>
        </div>

        {/* Filtro de datas - Liquid Glass */}
        <Card 
          className="mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: `
              inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.2),
              0 0 15px rgba(255, 255, 255, 0.1),
              0 4px 16px 0 rgba(0, 0, 0, 0.08),
              0 1px 4px 0 rgba(0, 0, 0, 0.04),
              inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
            `,
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Search className="w-4 h-4" />
              Filtrar por período
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Filtro por usuário (apenas para gestores) */}
              {isManager && (
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <label className="text-sm font-medium whitespace-nowrap text-slate-700 min-w-[60px]">Usuário:</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="flex-1 max-w-[300px]" style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}>
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
                </div>
              )}

              {/* Filtro de datas */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                  <label className="text-sm font-medium whitespace-nowrap min-w-[28px] text-slate-700">De</label>
                  <div className="relative flex-1">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                    <Input
                      type="text"
                      value={dateFrom}
                      onChange={(e) => {
                        const masked = applyDateMask(e.target.value);
                        if (masked.length <= 10) {
                          setDateFrom(masked);
                        }
                      }}
                      placeholder="dd/mm/aaaa"
                      maxLength={10}
                      className="pl-10"
                      style={{
                        background: 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: `
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                          0 0 0 1px rgba(255, 255, 255, 0.2),
                          0 0 10px rgba(255, 255, 255, 0.08),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.03)
                        `,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                  <label className="text-sm font-medium whitespace-nowrap min-w-[28px] text-slate-700">Até</label>
                  <div className="relative flex-1">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                    <Input
                      type="text"
                      value={dateTo}
                      onChange={(e) => {
                        const masked = applyDateMask(e.target.value);
                        if (masked.length <= 10) {
                          setDateTo(masked);
                        }
                      }}
                      placeholder="dd/mm/aaaa"
                      maxLength={10}
                      className="pl-10"
                      style={{
                        background: 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: `
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                          0 0 0 1px rgba(255, 255, 255, 0.2),
                          0 0 10px rgba(255, 255, 255, 0.08),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.03)
                        `,
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToday}
                    className="whitespace-nowrap"
                    style={{
                      background: 'rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: `
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                        0 0 0 1px rgba(255, 255, 255, 0.2),
                        0 0 10px rgba(255, 255, 255, 0.08),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.03)
                      `,
                    }}
                  >
                    Hoje
                  </Button>
                  <Button
                    onClick={handleSearch}
                    size="sm"
                    className="whitespace-nowrap gap-2"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: 'rgba(22, 101, 52, 0.8)',
                      boxShadow: `
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                        0 0 0 1px rgba(34, 197, 94, 0.2),
                        0 0 10px rgba(34, 197, 94, 0.1),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.03)
                      `,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(16, 185, 129, 0.25) 100%)';
                      e.currentTarget.style.border = '1px solid rgba(34, 197, 94, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%)';
                      e.currentTarget.style.border = '1px solid rgba(34, 197, 94, 0.3)';
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Filter className="w-4 h-4" />
                        Buscar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm flex-1">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
            <p className="text-slate-500">Carregando tarefas concluídas...</p>
          </div>
        )}

        {/* Conteúdo */}
        {!loading && (
          <div>
              {groupedData.length === 0 && (
                <div className="text-center py-16 space-y-3">
                  <CalendarDays className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-slate-500 text-lg">
                    Nenhuma tarefa concluída neste período.
                  </p>
                </div>
              )}

            {groupedData.map(({ roleLabel, role, users }) => (
              <div key={role || 'no-role'} className="mb-10">
                {/* Separador de role (apenas para gestores) */}
                {isManager && roleLabel && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200 text-base font-bold text-slate-800">
                      <span className="text-lg">🏢</span>
                      {roleLabel}
                    </div>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-sm text-slate-600 font-medium">
                      {users.reduce((sum, u) => sum + u.dateGroups.reduce((s, [, tasks]) => s + tasks.length, 0), 0)} tarefa{users.reduce((sum, u) => sum + u.dateGroups.reduce((s, [, tasks]) => s + tasks.length, 0), 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Grupos por usuário */}
                {users.map(({ userLabel, userId, dateGroups }) => (
                  <div key={userId || 'no-user'} className={isManager ? "mb-8 ml-4" : "mb-8"}>
                    {/* Separador de usuário (apenas para gestores) */}
                    {isManager && userLabel && (
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-base font-semibold text-slate-700">
                          <UserIcon className="w-4 h-4" />
                          {userLabel}
                        </div>
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-sm text-slate-600 font-medium">
                          {dateGroups.reduce((sum, [, tasks]) => sum + tasks.length, 0)} tarefa{dateGroups.reduce((sum, [, tasks]) => sum + tasks.length, 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Grupos por data */}
                    {dateGroups.map(([dateLabel, dateTasks]) => (
                  <div key={dateLabel} className={isManager ? "mb-6 ml-4" : "mb-8"}>
                    {/* Separador de data */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {dateLabel}
                      </div>
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-500">
                        {dateTasks.length} tarefa{dateTasks.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Grid de cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                      {dateTasks.map((task) => {
                      const config = statusConfig[task.status];
                      return (
                             <Card
                               key={task.id}
                               className="h-full flex flex-col transition-all duration-200 group backface-hidden overflow-hidden"
                               style={{
                                 background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
                                 backdropFilter: 'blur(20px) saturate(180%)',
                                 WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                 border: '1px solid rgba(255, 255, 255, 0.3)',
                                 boxShadow: `
                                   inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                   0 0 0 1px rgba(255, 255, 255, 0.2),
                                   0 0 15px rgba(255, 255, 255, 0.1),
                                   0 4px 16px 0 rgba(0, 0, 0, 0.08),
                                   0 1px 4px 0 rgba(0, 0, 0, 0.04),
                                   inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                                 `,
                               }}
                               onMouseEnter={() => {
                                 setHoveredCardId(task.id);
                               }}
                               onMouseLeave={() => {
                                 setHoveredCardId(null);
                               }}
                             >
                          <CardHeader className="pb-3 relative pt-8">
                            {/* Badge no canto superior esquerdo */}
                            <div className="absolute top-0 left-6 z-10">
                              <Badge 
                                variant="outline"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  backdropFilter: 'blur(12px) saturate(180%)',
                                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: `rgba(${getStatusColorRGB(task.status)}, 0.6)`,
                                  boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                    inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                    inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                    0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                    0 1px 4px 0 rgba(0, 0, 0, 0.06),
                                    0 0 8px 0 rgba(${getStatusColorRGB(task.status)}, 0.15)
                                  `,
                                }}
                              >
                                {config.label}
                              </Badge>
                            </div>

                            {/* Botões no canto superior direito */}
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
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    boxShadow: `
                                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                      0 2px 4px 0 rgba(0, 0, 0, 0.1)
                                    `,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
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
                                    setDeleteConfirm(task);
                                  }}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'rgba(239, 68, 68, 0.7)',
                                    boxShadow: `
                                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                      0 2px 4px 0 rgba(0, 0, 0, 0.1)
                                    `,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'rgba(239, 68, 68, 0.9)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}

                            {/* Título do card */}
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base font-semibold line-clamp-2 flex-1 min-h-[2lh]">
                                {task.name}
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col space-y-3">
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            {/* Info de atribuição */}
                            {task.assignedTo && isManager && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  backdropFilter: 'blur(12px) saturate(180%)',
                                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: 'rgba(71, 85, 105, 0.6)',
                                  boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                    inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                    inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                    0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                    0 1px 4px 0 rgba(0, 0, 0, 0.06),
                                    0 0 8px 0 rgba(71, 85, 105, 0.15)
                                  `,
                                }}
                              >
                                👤 {task.assignedTo.name}
                              </Badge>
                            )}

                            {/* Info de recorrência e horário limite */}
                            {(task.isRecurring || task.timeLimit) && (
                              <div className="flex flex-wrap gap-1.5">
                                {task.isRecurring && task.recurringDays && (
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs gap-1"
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.1)',
                                          backdropFilter: 'blur(12px) saturate(180%)',
                                          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                                          border: '1px solid rgba(255, 255, 255, 0.2)',
                                          color: 'rgba(109, 40, 217, 0.6)',
                                          boxShadow: `
                                            inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                            inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                            inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                            inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                            0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                            0 1px 4px 0 rgba(0, 0, 0, 0.06),
                                            0 0 8px 0 rgba(109, 40, 217, 0.15)
                                          `,
                                        }}
                                      >
                                        🔁 {formatRecurringDays(task.recurringDays)}
                                      </Badge>
                                    )}
                                    {task.timeLimit && (
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs gap-1"
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.1)',
                                          backdropFilter: 'blur(12px) saturate(180%)',
                                          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                                          border: '1px solid rgba(255, 255, 255, 0.2)',
                                          color: 'rgba(37, 99, 235, 0.6)',
                                          boxShadow: `
                                            inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                            inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                            inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                            inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                            0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                            0 1px 4px 0 rgba(0, 0, 0, 0.06),
                                            0 0 8px 0 rgba(37, 99, 235, 0.15)
                                          `,
                                        }}
                                      >
                                        <Clock className="w-3 h-3" />
                                        {task.timeLimit}
                                      </Badge>
                                    )}
                              </div>
                            )}

                            {/* Espaçador flexível */}
                            <div className="flex-1" />

                            <div className="min-h-[40px]">
                              {task.reason && (
                                <div className={`p-2 rounded-md text-xs ${config.bgLight} ${config.textColor}`}>
                                  <span className="font-semibold">Motivo: </span>{task.reason}
                                </div>
                              )}
                            </div>

                            {/* Data de conclusão */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t border-border">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              <span>{formatDateTime(task.updatedAt)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    </div>
                  </div>
                ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
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

export default CompletedTasksPage;
