import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, AlertCircle, Search, CalendarDays, Clock, CheckCircle2,
  LayoutDashboard, Users, FileText, CalendarCheck, Shield, LogOut, ClipboardList,
} from 'lucide-react';
import { Task, statusConfig, TaskStatus } from '@/types/task';
import { taskApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface CompletedTasksPageProps {
  onBack: () => void;
  onNavigate?: (page: 'tasks' | 'completed' | 'users' | 'audit') => void;
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

/** Converte formato ISO (aaaa-mm-dd) para brasileiro (dd/mm/aaaa) */
function isoToBR(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
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
  const { user, isManager, logout } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  /** Converte string "seg,qua,sex" em labels legíveis */
  const formatRecurringDays = (days: string | null | undefined): string => {
    if (!days) return '';
    const dayMap: Record<string, string> = {
      dom: 'Dom', seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb',
    };
    return days.split(',').map(d => dayMap[d] || d).join(', ');
  };

  // Agrupar por data de conclusão
  const groupedByDate: Record<string, Task[]> = {};
  for (const t of tasks) {
    const dateKey = new Date(t.updatedAt).toLocaleDateString('pt-BR');
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(t);
  }

  const dateGroups = Object.entries(groupedByDate);

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════ Header Transparent Glass ═══════════ */}
      <header
        className="sticky top-0 z-50 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: `
            inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.15),
            0 0 20px rgba(255, 255, 255, 0.08),
            0 8px 32px 0 rgba(0, 0, 0, 0.1),
            0 2px 8px 0 rgba(0, 0, 0, 0.06)
          `,
        }}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-[72px]">
            {/* ── Lado esquerdo: Logo + título (clicável para voltar) ── */}
            <button
              onClick={onBack}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 shadow-md">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-800 leading-tight tracking-tight">
                  Gestor de Tarefas
                </h1>
                <p className="text-[11px] text-slate-500 leading-none -mt-0.5">
                  Painel de controle
                </p>
              </div>
            </button>

            {/* ── Centro: Navegação (botões agrupados) ── */}
            <nav className="flex items-center gap-0.5">
              {/* Botão Tarefas (voltar) */}
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/30 transition-all duration-200"
              >
                <CalendarCheck className="w-4 h-4 text-slate-700" />
                <span className="hidden lg:inline">Tarefas</span>
              </button>

              {/* Concluídas (ativo) */}
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-900 bg-white/40 hover:bg-white/50 transition-all duration-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="hidden lg:inline">Concluídas</span>
              </button>

              {/* Menu do gestor */}
              {isManager && (
                <>
                  <button
                    onClick={() => onNavigate ? onNavigate('users') : onBack()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/30 transition-all duration-200"
                  >
                    <Users className="w-4 h-4 text-slate-700" />
                    <span className="hidden lg:inline">Usuários</span>
                  </button>
                  <button
                    onClick={() => onNavigate ? onNavigate('audit') : onBack()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/30 transition-all duration-200"
                  >
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span className="hidden lg:inline">Auditoria</span>
                  </button>
                </>
              )}
            </nav>

            {/* ── Lado direito: Perfil + Sair ── */}
            <div className="flex items-center gap-3">
              {/* Separador */}
              <div className="w-px h-8 bg-slate-300/50 hidden sm:block" />

              {/* Avatar + nome */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 ring-2 ring-white/30 shadow-md">
                  <span className="text-sm font-bold text-white uppercase">
                    {user?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">
                    {user?.name}
                  </p>
                  <div className="flex items-center gap-1">
                    {isManager ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded-full">
                        <Shield className="w-2.5 h-2.5" />
                        Gestor
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Funcionário</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sair */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50/50 transition-all duration-200"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDateFrom(todayBR()); setDateTo(todayBR()); }}
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
              {dateGroups.length === 0 && (
                <div className="text-center py-16 space-y-3">
                  <CalendarDays className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-slate-500 text-lg">
                    Nenhuma tarefa concluída neste período.
                  </p>
                </div>
              )}

            {dateGroups.map(([dateLabel, dateTasks]) => (
              <div key={dateLabel} className="mb-8">
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
                      const isCompleted = task.status === 'completed';
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
                               onMouseEnter={(e) => {
                                 e.currentTarget.style.boxShadow = `
                                   inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                                   0 0 0 1px rgba(255, 255, 255, 0.3),
                                   0 0 20px rgba(255, 255, 255, 0.15),
                                   0 8px 24px 0 rgba(0, 0, 0, 0.12),
                                   0 2px 8px 0 rgba(0, 0, 0, 0.06),
                                   inset 0 -1px 0 0 rgba(0, 0, 0, 0.06)
                                 `;
                                 e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.4)';
                               }}
                               onMouseLeave={(e) => {
                                 e.currentTarget.style.boxShadow = `
                                   inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                   0 0 0 1px rgba(255, 255, 255, 0.2),
                                   0 0 15px rgba(255, 255, 255, 0.1),
                                   0 4px 16px 0 rgba(0, 0, 0, 0.08),
                                   0 1px 4px 0 rgba(0, 0, 0, 0.04),
                                   inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                                 `;
                                 e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                               }}
                             >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base font-semibold line-clamp-2 flex-1 min-h-[2lh]">
                                {task.name}
                              </CardTitle>
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
        )}
      </div>
    </div>
  );
};

export default CompletedTasksPage;
