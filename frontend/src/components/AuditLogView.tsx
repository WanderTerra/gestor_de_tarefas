import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, LayoutDashboard, Shield, LogOut, CheckCircle2, Users, FileText, CalendarCheck, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { AuditLog } from '@/types/user';
import { auditApi, ApiError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLogViewProps {
  onBack: () => void;
  onNavigate?: (page: 'tasks' | 'completed' | 'users' | 'audit') => void;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: 'Criação', color: 'bg-green-50 text-green-600 border-green-200' },
  update: { label: 'Edição', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  delete: { label: 'Exclusão', color: 'bg-red-50 text-red-600 border-red-200' },
  status_change: { label: 'Status', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  login: { label: 'Login', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  overdue_previous_day: { label: 'Atraso (Dia Anterior)', color: 'bg-slate-100/80 text-slate-700 border-slate-300/50' },
  overdue_time_limit: { label: 'Atraso (Horário)', color: 'bg-red-100/80 text-red-700 border-red-300/50' },
};

/** Helper para obter cor RGB da ação para badges de vidro transparente (cores suaves/pastéis) */
const getActionColorRGB = (action: string): string => {
  const colorMap: Record<string, string> = {
    'create': '74, 222, 128',        // green-400 (mais suave)
    'update': '96, 165, 250',        // blue-400 (mais suave)
    'delete': '248, 113, 113',       // red-400 (mais suave)
    'status_change': '251, 146, 60', // orange-400 (mais suave)
    'login': '167, 139, 250',        // purple-400 (mais suave)
    'overdue_previous_day': '148, 163, 184', // slate-400
    'overdue_time_limit': '248, 113, 113',   // red-400 (mais suave)
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
  const { user, isManager, logout } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const pageSize = 20;

  const fetchLogs = async (offset: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await auditApi.getAll({ limit: pageSize, offset });
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page * pageSize);
  }, [page]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

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

              {/* Concluídas */}
              <button
                onClick={() => onNavigate ? onNavigate('completed') : onBack()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/30 transition-all duration-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="hidden lg:inline">Concluídas</span>
              </button>

              {/* Usuários */}
              {isManager && (
                <button
                  onClick={() => onNavigate ? onNavigate('users') : onBack()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/30 transition-all duration-200"
                >
                  <Users className="w-4 h-4 text-slate-700" />
                  <span className="hidden lg:inline">Usuários</span>
                </button>
              )}

              {/* Auditoria (ativo) */}
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-900 bg-white/40 hover:bg-white/50 transition-all duration-200"
              >
                <FileText className="w-4 h-4 text-slate-700" />
                <span className="hidden lg:inline">Auditoria</span>
              </button>
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
        <div className="space-y-6">
          {/* Título da página */}
          <div className="flex items-center justify-between pt-4 mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-foreground">
                Auditoria
              </h2>
            </div>
            <Badge 
              variant="outline"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.6) 100%)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                color: 'rgba(0, 0, 0, 0.9)',
                boxShadow: `
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.6),
                  0 2px 4px 0 rgba(0, 0, 0, 0.1)
                `,
              }}
            >
              {total} registro{total !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm flex-1">{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-700">✕</Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
              <p className="text-slate-500">Carregando auditoria...</p>
            </div>
          )}

          {/* Seção destacada: Logs de atraso */}
          {!loading && (() => {
            const relevantLogs = logs.filter(log => 
              log.action === 'overdue_previous_day' || log.action === 'overdue_time_limit'
            );
            const otherLogs = logs.filter(log => 
              log.action !== 'overdue_previous_day' && log.action !== 'overdue_time_limit'
            );

            return (
              <div className="space-y-6">
                {/* Logs relevantes destacados - Agrupados por dia */}
                {relevantLogs.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-slate-700" />
                      <h3 className="text-base font-bold text-slate-800">
                        Atrasos e Pendências
                      </h3>
                      <Badge 
                        variant="outline" 
                        className="bg-white/20 border-white/30 text-slate-700"
                        style={{
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                        }}
                      >
                        {relevantLogs.length}
                      </Badge>
                    </div>

                    {groupLogsByDate(relevantLogs).map(([dateKey, dateLogs]) => (
                      <div key={dateKey} className="space-y-3">
                        {/* Separador com data e contador */}
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)',
                              backdropFilter: 'blur(12px) saturate(180%)',
                              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              color: 'rgba(0, 0, 0, 0.75)',
                              boxShadow: `
                                inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                0 1px 2px 0 rgba(0, 0, 0, 0.05)
                              `,
                            }}
                          >
                            <CalendarCheck className="w-3.5 h-3.5" style={{ color: 'rgba(0, 0, 0, 0.7)' }} />
                            {dateKey}
                          </div>
                          <div className="flex-1 h-px" style={{ background: 'rgba(0, 0, 0, 0.1)' }} />
                          <span className="text-xs" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                            {dateLogs.length} evento{dateLogs.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Cards de logs do dia - Transparent Glass */}
                        <div 
                          className="rounded-xl overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)',
                            backdropFilter: 'blur(30px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: `
                              inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                              0 0 0 1px rgba(255, 255, 255, 0.15),
                              0 0 20px rgba(255, 255, 255, 0.08),
                              0 8px 32px 0 rgba(0, 0, 0, 0.12),
                              0 2px 8px 0 rgba(0, 0, 0, 0.08),
                              inset 0 -1px 0 0 rgba(0, 0, 0, 0.04)
                            `,
                          }}
                        >
                          {/* Lista de logs do dia */}
                          <div className="divide-y divide-white/20">
                            {dateLogs.map((log) => {
                            const action = actionLabels[log.action] || { label: log.action, color: 'bg-gray-50 text-gray-600 border-gray-200' };
                            const details = parseDetails(log.details);

                            return (
                              <div 
                                key={log.id} 
                                className="px-4 py-3 transition-all duration-200"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                                  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)';
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 mt-1">
                                    {log.action === 'overdue_previous_day' ? (
                                      <Clock className="w-5 h-5 text-slate-700" />
                                    ) : (
                                      <AlertCircle className="w-5 h-5 text-red-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs"
                                        style={{
                                          background: `rgba(${getActionColorRGB(log.action)}, 0.12)`,
                                          backdropFilter: 'blur(12px)',
                                          WebkitBackdropFilter: 'blur(12px)',
                                          border: `1px solid rgba(${getActionColorRGB(log.action)}, 0.25)`,
                                          color: `rgba(${getActionColorRGB(log.action)}, 0.75)`,
                                        }}
                                      >
                                        {action.label}
                                      </Badge>
                                      <span className="text-xs text-slate-500">
                                        {formatTime(log.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 mb-1">
                                      {log.user.name} <span className="text-slate-500 text-xs">@{log.user.username}</span>
                                    </p>
                                    <p className="text-sm text-slate-700">
                                      {formatDetailText(log, details)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão para ver detalhamento completo */}
                {otherLogs.length > 0 && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowFullDetails(!showFullDetails)}
                      className="gap-2"
                    >
                      {showFullDetails ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Ocultar detalhamento completo
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver detalhamento completo ({otherLogs.length} registro{otherLogs.length !== 1 ? 's' : ''})
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Tabela completa (oculta por padrão) */}
                {showFullDetails && otherLogs.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-slate-100 border-b">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Detalhamento Completo
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium">Data/Hora</th>
                            <th className="text-left px-4 py-3 font-medium">Usuário</th>
                            <th className="text-left px-4 py-3 font-medium">Ação</th>
                            <th className="text-left px-4 py-3 font-medium">Entidade</th>
                            <th className="text-left px-4 py-3 font-medium">Detalhes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {otherLogs.map((log) => {
                            const action = actionLabels[log.action] || { label: log.action, color: 'bg-gray-50 text-gray-600 border-gray-200' };
                            const details = parseDetails(log.details);

                            return (
                              <tr key={log.id} className="hover:bg-muted/30">
                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                  {formatDate(log.createdAt)}
                                </td>
                                <td className="px-4 py-3">
                                  <div>
                                    <span className="font-medium">{log.user.name}</span>
                                    <span className="text-muted-foreground ml-1 text-xs">@{log.user.username}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge 
                                    variant="outline"
                                    style={{
                                      background: `rgba(${getActionColorRGB(log.action)}, 0.12)`,
                                      backdropFilter: 'blur(12px)',
                                      WebkitBackdropFilter: 'blur(12px)',
                                      border: `1px solid rgba(${getActionColorRGB(log.action)}, 0.25)`,
                                      color: `rgba(${getActionColorRGB(log.action)}, 0.75)`,
                                    }}
                                  >
                                    {action.label}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {entityLabels[log.entity] || log.entity}
                                  {log.entityId && <span className="text-muted-foreground ml-1">#{log.entityId}</span>}
                                </td>
                                <td className="px-4 py-3 max-w-sm text-muted-foreground">
                                  {formatDetailText(log, details)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      Página {page + 1} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        Próxima
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Estado vazio */}
                {logs.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-slate-500 text-lg">
                      Nenhum registro de auditoria encontrado.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default AuditLogView;
