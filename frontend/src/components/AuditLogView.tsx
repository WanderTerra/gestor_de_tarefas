import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, FileText, Clock, CalendarCheck, X, RefreshCw, Filter } from 'lucide-react';
import { AuditLog } from '@/types/user';
import { auditApi, userApi, ApiError } from '@/services/api';
import type { User } from '@/types/user';
import Header from '@/components/Header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AuditLogViewProps {
  onBack: () => void;
  onNavigate?: (page: 'tasks' | 'general' | 'users' | 'audit' | 'authorization-requests' | 'all-tasks') => void;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: 'Criação', color: 'bg-green-50 text-green-600 border-green-200' },
  update: { label: 'Edição', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  delete: { label: 'Exclusão', color: 'bg-red-50 text-red-600 border-red-200' },
  status_change: { label: 'Status', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  login: { label: 'Login', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  approve: { label: 'Aprovação', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  reject: { label: 'Rejeição', color: 'bg-red-50 text-red-600 border-red-200' },
  overdue_previous_day: { label: 'Atraso (Dia Anterior)', color: 'bg-slate-100/80 text-slate-700 border-slate-300/50' },
  overdue_time_limit: { label: 'Atraso (Horário)', color: 'bg-red-100/80 text-red-700 border-red-300/50' },
};

/** Helper para obter cor RGB da ação para badges de vidro transparente (cores suaves/pastéis) */
const getActionColorRGB = (action: string): string => {
  const colorMap: Record<string, string> = {
    'create': '74, 222, 128',
    'update': '96, 165, 250',
    'delete': '248, 113, 113',
    'status_change': '251, 146, 60',
    'login': '167, 139, 250',
    'approve': '52, 211, 153',
    'reject': '248, 113, 113',
    'overdue_previous_day': '148, 163, 184',
    'overdue_time_limit': '248, 113, 113',
  };
  return colorMap[action] || '148, 163, 184';
};

const entityLabels: Record<string, string> = {
  task: 'Tarefa',
  user: 'Usuário',
  auth: 'Autenticação',
};

/** Traduz nomes de campos técnicos para português */
const fieldLabels: Record<string, string> = {
  name: 'nome',
  description: 'descrição',
  status: 'status',
  reason: 'motivo',
  isRecurring: 'recorrência',
  recurringDays: 'dias de recorrência',
  timeLimit: 'horário limite',
  assignedToId: 'responsável',
  deadline: 'prazo',
  password: 'senha',
  role: 'perfil',
  active: 'ativação',
};

/** Traduz nomes de status para português */
const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  'in-progress': 'Em andamento',
  waiting: 'Aguardando ação',
  completed: 'Concluído',
  'not-executed': 'Não executado',
};

/** Traduz nomes de roles para português */
const roleLabels: Record<string, string> = {
  manager: 'Gestor',
  employee: 'Funcionário',
};

/** Gera uma descrição legível a partir dos dados brutos do log */
function formatDetailText(log: AuditLog, details: Record<string, unknown> | null): string {
  if (!details) return '—';

  const { action, entity } = log;

  // ─── Login ─────────────────────────────────────
  if (action === 'login') {
    return 'Entrou no sistema';
  }

  // ─── Tarefa ────────────────────────────────────
  if (entity === 'task') {
    if (action === 'overdue_previous_day') {
      return `Tarefa pendente do dia anterior: "${details.taskName || ''}"`;
    }

    if (action === 'overdue_time_limit') {
      return `Tarefa ultrapassou o horário limite (${details.timeLimit || ''}): "${details.taskName || ''}"`;
    }

    if (action === 'create') {
      return `Criou a tarefa "${details.name || ''}"`;
    }

    if (action === 'delete') {
      return `Excluiu a tarefa "${details.name || ''}"`;
    }

    if (action === 'status_change') {
      const from = statusLabels[String(details.oldStatus)] || details.oldStatus;
      const to = statusLabels[String(details.newStatus)] || details.newStatus;
      return `Alterou status de "${from}" para "${to}"`;
    }

    if (action === 'update') {
      const changes = details.changes as string[] | undefined;
      if (changes && changes.length > 0) {
        const translated = changes
          .filter(c => c !== 'status' && c !== 'reason') // status_change já trata esses
          .map(c => fieldLabels[c] || c);
        if (translated.length === 0) return 'Editou a tarefa';
        return `Editou: ${translated.join(', ')}`;
      }
      return 'Editou a tarefa';
    }
  }

  // ─── Usuário ───────────────────────────────────
  if (entity === 'user') {
    if (action === 'create') {
      const role = roleLabels[String(details.role)] || details.role;
      return `Criou o ${role} "${details.name || details.username || ''}"`;
    }

    if (action === 'approve') {
      return `Aprovou o usuário "${details.name || details.username || ''}"`;
    }

    if (action === 'reject') {
      return `Rejeitou o usuário "${details.name || details.username || ''}"${details.reason ? `: ${details.reason}` : ''}`;
    }

    if (action === 'update') {
      const changes = details.changes as string[] | undefined;
      if (changes && changes.length > 0) {
        const translated = changes.map(c => fieldLabels[c] || c);
        return `Editou usuário: ${translated.join(', ')}`;
      }
      return 'Editou o usuário';
    }
  }

  return '—';
}

const AuditLogView: React.FC<AuditLogViewProps> = ({ onBack, onNavigate }) => {

  const handleNavigate = (navPage: 'tasks' | 'users' | 'audit' | 'general' | 'authorization-requests' | 'all-tasks') => {
    if (navPage === 'audit') {
      // Já estamos na página de auditoria
      return;
    }
    if (onNavigate) {
      onNavigate(navPage);
    } else {
      onBack();
    }
  };
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userIdFilter, setUserIdFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const pageSize = 25;

  const fetchLogs = useCallback(async (offset: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await auditApi.getAll({
        limit: pageSize,
        offset,
        ...(entityFilter !== 'all' && { entity: entityFilter }),
        ...(userIdFilter !== 'all' && { userId: Number(userIdFilter) }),
        ...(actionFilter !== 'all' && { action: actionFilter }),
      });
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  }, [entityFilter, userIdFilter, actionFilter]);

  useEffect(() => {
    userApi.getAll().then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    setPage(0);
  }, [entityFilter, userIdFilter, actionFilter]);

  useEffect(() => {
    fetchLogs(page * pageSize);
  }, [page, fetchLogs]);

  const formatDateOnly = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const groupLogsByDate = (logs: AuditLog[]) => {
    const grouped: Record<string, AuditLog[]> = {};
    logs.forEach((log) => {
      const dateKey = formatDateOnly(log.createdAt);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(log);
    });
    // Ordenar logs dentro de cada dia (mais recente primeiro)
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
    // Ordenar por data (mais recente primeiro)
    return Object.entries(grouped).sort((a, b) => {
      const dateA = new Date(a[0].split('/').reverse().join('-'));
      const dateB = new Date(b[0].split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
  };

  const parseDetails = (details: string | null): Record<string, unknown> | null => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentPage="audit"
        onNavigate={handleNavigate}
        tasks={[]}
      />

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 mb-2">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-700" />
                Auditoria
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Histórico de ações no sistema (tarefas, usuários e acessos).
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="outline"
                className="bg-white/80 backdrop-blur border-slate-200 text-slate-700"
              >
                {total} registro{total !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page * pageSize)}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div
            className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm"
          >
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                <SelectItem value="task">Tarefa</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="auth">Autenticação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(actionLabels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userIdFilter} onValueChange={setUserIdFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name} (@{u.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm flex-1">{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-700"><X className="w-4 h-4" /></Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
              <p className="text-slate-500">Carregando auditoria...</p>
            </div>
          )}

          {/* Lista unificada por data */}
          {!loading && logs.length > 0 && (
            <div className="space-y-6">
              {groupLogsByDate(logs).map(([dateKey, dateLogs]) => (
                <div key={dateKey} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      {dateKey}
                    </div>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-500">
                      {dateLogs.length} evento{dateLogs.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
                    {dateLogs.map((log) => {
                      const action = actionLabels[log.action] || { label: log.action, color: 'bg-gray-50 text-gray-600 border-gray-200' };
                      const details = parseDetails(log.details);
                      const isOverdue = log.action === 'overdue_previous_day' || log.action === 'overdue_time_limit';

                      return (
                        <div
                          key={log.id}
                          className="px-4 py-3 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {log.action === 'login' && (
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                  <Clock className="w-4 h-4 text-purple-600" />
                                </div>
                              )}
                              {isOverdue && (
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                </div>
                              )}
                              {!log.action.includes('overdue') && log.action !== 'login' && (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center"
                                  style={{
                                    background: `rgba(${getActionColorRGB(log.action)}, 0.15)`,
                                  }}
                                >
                                  <FileText className="w-4 h-4" style={{ color: `rgb(${getActionColorRGB(log.action)})` }} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium"
                                  style={{
                                    background: `rgba(${getActionColorRGB(log.action)}, 0.12)`,
                                    border: `1px solid rgba(${getActionColorRGB(log.action)}, 0.3)`,
                                    color: `rgb(${getActionColorRGB(log.action)})`,
                                  }}
                                >
                                  {action.label}
                                </Badge>
                                <span className="text-xs text-slate-400">
                                  {entityLabels[log.entity] || log.entity}
                                  {log.entityId != null && (
                                    <span className="ml-1">#{log.entityId}</span>
                                  )}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatTime(log.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-slate-800">
                                {log.user.name}{' '}
                                <span className="text-slate-500 font-normal text-xs">@{log.user.username}</span>
                              </p>
                              <p className="text-sm text-slate-600 mt-0.5">
                                {formatDetailText(log, details)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200">
                  <span className="text-sm text-slate-600">
                    {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado vazio */}
          {!loading && logs.length === 0 && (
            <div className="text-center py-16 rounded-xl border border-slate-200 bg-slate-50/50">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium">Nenhum registro de auditoria</p>
              <p className="text-sm text-slate-500 mt-1">
                {entityFilter !== 'all' || userIdFilter !== 'all' || actionFilter !== 'all'
                  ? 'Tente alterar os filtros para ver mais resultados.'
                  : 'As ações no sistema aparecerão aqui.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogView;
