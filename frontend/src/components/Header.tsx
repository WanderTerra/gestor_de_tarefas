import React, { useRef, useState, useEffect } from 'react';
import { 
  CalendarCheck, BadgeCheck, Users, UserPlus, FileSearch, 
  Bell, LogOut, Shield, ClipboardCheck, List
} from 'lucide-react';
import { useButtonInteraction } from '@/hooks/useButtonInteraction';
import { useAuth } from '@/contexts/AuthContext';
import { overdueApi, OverdueAlert, authApi, taskApi } from '@/services/api';
import { User } from '@/types/user';
import { Task, TaskStatus } from '@/types/task';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Page = 'tasks' | 'users' | 'audit' | 'general' | 'all-tasks' | 'authorization-requests';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  tasks?: Task[];
  isTerminalStatus?: (status: TaskStatus) => boolean;
}

const defaultIsTerminalStatus = (status: string): boolean =>
  status === 'completed' || status === 'not-executed';

/** Botão de navegação — estilo segmented: ativo = pill preenchida, inativo = transparente */
const NavButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  icon: React.ReactNode;
  label: string;
  accentColor?: string; // para Concluídas (verde)
}> = ({ onClick, isActive = false, icon, label, accentColor }) => {
  const buttonInteraction = useButtonInteraction(onClick, {
    rippleColor: isActive ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.06)',
    scaleOnClick: 0.97,
    rippleDuration: 600,
    scaleDuration: 150,
  });

  const activeBg = accentColor || 'linear-gradient(135deg, #334155 0%, #1e293b 100%)';
  const activeColor = 'rgba(255, 255, 255, 0.98)';

  return (
    <button
      {...buttonInteraction}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-250 ease-out min-w-0"
      style={{
        background: isActive ? activeBg : 'transparent',
        color: isActive ? activeColor : 'rgba(30, 41, 59, 0.85)',
        boxShadow: isActive
          ? '0 2px 8px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
          : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
          e.currentTarget.style.color = 'rgba(15, 23, 42, 0.95)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(30, 41, 59, 0.85)';
        }
      }}
    >
      {icon}
      <span className="hidden lg:inline truncate">{label}</span>
    </button>
  );
};

<<<<<<< Updated upstream
<<<<<<< Updated upstream
const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
=======
const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, tasks: _tasks = [], isTerminalStatus: _isTerminalStatus }) => {
>>>>>>> Stashed changes
=======
const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, tasks: _tasks = [], isTerminalStatus: _isTerminalStatus }) => {
>>>>>>> Stashed changes
  const { logout, isManager, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [overdueAlerts, setOverdueAlerts] = useState<OverdueAlert[]>([]);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const [taskStats, setTaskStats] = useState<{ active: number; completed: number; overdue: number } | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Buscar contagens de tarefas para o modal do perfil (ativas, completas, atrasadas) em qualquer tela
  useEffect(() => {
    if (!showUserModal) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await taskApi.getAll();
        if (cancelled) return;
        const active = all.filter((t) => !defaultIsTerminalStatus(t.status)).length;
        const completed = all.filter((t) => defaultIsTerminalStatus(t.status)).length;
        const overdue = all.filter((t) => t.isOverdue).length;
        setTaskStats({ active, completed, overdue });
      } catch {
        if (!cancelled) setTaskStats({ active: 0, completed: 0, overdue: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, [showUserModal]);

  // Hooks de interação para botões
  const logoButtonInteraction = useButtonInteraction(() => onNavigate('tasks'), { 
    rippleColor: 'rgba(255, 255, 255, 0.8)',
    scaleOnClick: 0.90,
    rippleDuration: 800,
    scaleDuration: 200,
  });
  const notificationButtonInteraction = useButtonInteraction(() => setShowNotifications((prev) => !prev), { 
    rippleColor: 'rgba(255, 255, 255, 0.9)',
    scaleOnClick: 0.90,
    rippleDuration: 800,
    scaleDuration: 200,
  });
  const logoutButtonInteraction = useButtonInteraction(logout, { 
    rippleColor: 'rgba(220, 38, 38, 0.7)',
    scaleOnClick: 0.90,
    rippleDuration: 800,
    scaleDuration: 200,
  });
  const avatarButtonInteraction = useButtonInteraction(() => setShowUserModal(true), {
    rippleColor: 'rgba(255, 255, 255, 0.5)',
    scaleOnClick: 0.95,
    rippleDuration: 600,
    scaleDuration: 150,
  });

  // Carregar alertas e solicitações
  useEffect(() => {
    const loadData = async () => {
      try {
        const alerts = await overdueApi.getActive();
        setOverdueAlerts(Array.isArray(alerts) ? alerts : []);
        if (isManager) {
          const requests = await authApi.getPendingRequests();
          setPendingRequests(Array.isArray(requests) ? requests : []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do header:', error);
        setOverdueAlerts([]);
        setPendingRequests([]);
      }
    };
    loadData();
  }, [isManager]);

  // Fechar notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: `
          inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.2),
          0 0 20px rgba(255, 255, 255, 0.08),
          0 8px 32px 0 rgba(0, 0, 0, 0.1),
          0 2px 8px 0 rgba(0, 0, 0, 0.06)
        `,
      }}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 h-16 md:h-[72px]">
          {/* ── Lado esquerdo: Logo + título (clicável) ── */}
          <div className="flex items-center justify-start min-w-0">
            <button
              {...logoButtonInteraction}
              className="flex items-center gap-3 group focus:outline-none"
              title="Voltar para Tarefas"
            >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="/logosemfundomenor.png"
                alt="Logo Gestor de Tarefas"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden sm:block text-left">
              <h1 className="text-lg font-bold text-slate-800 leading-tight tracking-tight group-hover:text-slate-900 transition-colors">
                Gestor de Tarefas
              </h1>
              <p className="text-[11px] text-slate-500 leading-none -mt-0.5">
                Painel de controle
              </p>
            </div>
            </button>
          </div>

          {/* ── Centro: Navegação em barra única (segmented control) ── */}
          <nav
            className="flex items-center p-1.5 rounded-2xl gap-0.5"
            style={{
              background: 'rgba(226, 232, 240, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(203, 213, 225, 0.9)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 2px 10px rgba(0, 0, 0, 0.08)',
            }}
          >
            <NavButton
              onClick={() => onNavigate('tasks')}
              isActive={currentPage === 'tasks'}
              icon={<CalendarCheck className="w-4 h-4 shrink-0" style={{ color: 'currentColor' }} />}
              label="Tarefas"
            />
            {!isManager && (
              <NavButton
                onClick={() => onNavigate('all-tasks')}
                isActive={currentPage === 'all-tasks'}
                icon={<List className="w-4 h-4 shrink-0" style={{ color: 'currentColor' }} />}
                label="Todas"
              />
            )}
            <NavButton
              onClick={() => onNavigate('general')}
              isActive={currentPage === 'general'}
              accentColor="linear-gradient(135deg, #059669 0%, #047857 100%)"
              icon={<BadgeCheck className="w-4 h-4 shrink-0" style={{ color: 'currentColor' }} />}
              label="Geral"
            />
            {isManager && (
              <>
                <NavButton
                  onClick={() => onNavigate('users')}
                  isActive={currentPage === 'users'}
                  icon={<Users className="w-4 h-4 shrink-0" style={{ color: 'currentColor' }} />}
                  label="Usuários"
                />
                <NavButton
                  onClick={() => onNavigate('authorization-requests')}
                  isActive={currentPage === 'authorization-requests'}
                  icon={<UserPlus className="w-4 h-4 shrink-0" style={{ color: 'currentColor' }} />}
                  label="Solicitações"
                />
                <NavButton
                  onClick={() => onNavigate('audit')}
                  isActive={currentPage === 'audit'}
                  icon={<FileSearch className="w-4 h-4 shrink-0" style={{ color: 'currentColor' }} />}
                  label="Auditoria"
                />
              </>
            )}
          </nav>

          {/* ── Lado direito: Contador + Notificações + Perfil + Sair ── */}
          <div className="flex items-center justify-end gap-4 min-w-0">
            {/* Notification bell */}
            {((overdueAlerts?.length ?? 0) > 0 || (isManager && (pendingRequests?.length ?? 0) > 0)) && (
              <div className="relative" ref={notifRef}>
                <button
                  {...notificationButtonInteraction}
                  className="relative p-1.5 rounded-lg transition-all duration-200"
                  title="Notificações"
                  style={{
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.border = 'none';
                  }}
                >
                  <Bell className="w-5 h-5 animate-pulse" style={{ color: 'rgba(0, 0, 0, 0.7)' }} />
                  <span 
                    className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                    style={{
                      background: 'rgba(220, 38, 38, 0.9)',
                      boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.6), 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    {(overdueAlerts?.length ?? 0) + (isManager ? (pendingRequests?.length ?? 0) : 0)}
                  </span>
                </button>

                {/* Dropdown de notificações */}
                {showNotifications && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-80 rounded-xl z-50 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.92) 100%)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      boxShadow: `
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.6),
                        0 0 0 1px rgba(255, 255, 255, 0.3),
                        0 8px 32px 0 rgba(0, 0, 0, 0.15),
                        0 2px 8px 0 rgba(0, 0, 0, 0.1),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                      `,
                    }}
                  >
                    {/* Seção de Solicitações Pendentes */}
                    {isManager && (pendingRequests?.length ?? 0) > 0 && (
                      <>
                        <div 
                          className="px-4 py-3 border-b"
                          style={{
                            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
                            borderColor: 'rgba(37, 99, 235, 0.2)',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 shrink-0" style={{ color: 'rgba(37, 99, 235, 0.8)' }} />
                            <h3 className="text-sm font-semibold" style={{ color: 'rgba(37, 99, 235, 0.9)' }}>
                              Solicitações de Acesso
                            </h3>
                          </div>
                          <p className="text-[11px] mt-1" style={{ color: 'rgba(37, 99, 235, 0.75)' }}>
                            {pendingRequests?.length ?? 0} solicitação{(pendingRequests?.length ?? 0) !== 1 ? 'ões' : ''} aguardando aprovação
                          </p>
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {(pendingRequests ?? []).slice(0, 5).map((request) => (
                            <div 
                              key={request.id} 
                              className="px-4 py-2.5 transition-colors cursor-pointer hover:bg-white/50"
                              style={{
                                borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
                              }}
                              onClick={() => {
                                setShowNotifications(false);
                                onNavigate('authorization-requests');
                              }}
                            >
                              <p className="text-sm font-medium" style={{ color: 'rgba(0, 0, 0, 0.9)' }}>
                                {request.name}
                              </p>
                              <p className="text-xs" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                                {request.username}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Seção de Tarefas Atrasadas */}
                    {(overdueAlerts?.length ?? 0) > 0 && (
                      <>
                        {isManager && (pendingRequests?.length ?? 0) > 0 && (
                          <div className="h-px" style={{ background: 'rgba(0, 0, 0, 0.05)' }} />
                        )}
                        <div 
                          className="px-4 py-3 border-b"
                          style={{
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)',
                            borderColor: 'rgba(239, 68, 68, 0.2)',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 shrink-0" style={{ color: 'rgba(239, 68, 68, 0.8)' }} />
                            <h3 className="text-sm font-semibold" style={{ color: 'rgba(239, 68, 68, 0.9)' }}>
                              Tarefas Atrasadas
                            </h3>
                          </div>
                          <p className="text-[11px] mt-1" style={{ color: 'rgba(239, 68, 68, 0.75)' }}>
                            {overdueAlerts?.length ?? 0} tarefa{(overdueAlerts?.length ?? 0) !== 1 ? 's' : ''} atrasada{(overdueAlerts?.length ?? 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {(overdueAlerts ?? []).slice(0, 5).map((alert) => (
                            <div 
                              key={alert.id} 
                              className="px-4 py-2.5 transition-colors"
                              style={{
                                borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
                              }}
                            >
                              <p className="text-sm font-medium" style={{ color: 'rgba(0, 0, 0, 0.9)' }}>
                                {alert.task.name}
                              </p>
                              <p className="text-xs" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                                {alert.referenceDate ? 'Pendente do dia anterior' : 'Ultrapassou horário limite'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Separador */}
            <div className="w-px h-8 hidden sm:block rounded-full" style={{ background: 'rgba(0, 0, 0, 0.12)' }} />

            {/* Um único bloco: avatar (abre modal) + Sair */}
            <div
              className="flex items-center gap-1 p-1 rounded-xl"
              style={{
                background: 'rgba(226, 232, 240, 0.92)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(203, 213, 225, 0.9)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 1px 4px rgba(0, 0, 0, 0.08)',
              }}
            >
              <button
                {...avatarButtonInteraction}
                className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-transform hover:scale-105"
                title="Ver informações"
                style={{
                  background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 6px rgba(0, 0, 0, 0.12)',
                }}
              >
                <span className="text-sm font-bold text-white uppercase">
                  {user?.name?.charAt(0) || '?'}
                </span>
              </button>
              <button
                {...logoutButtonInteraction}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                title="Sair"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(185, 28, 28, 0.9)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(220, 38, 38, 0.12)';
                  e.currentTarget.style.color = 'rgba(185, 28, 28, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(185, 28, 28, 0.9)';
                }}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          {/* Modal de informações (avatar) — nome, perfil e tarefas (ativas, completas, atrasadas) */}
          <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <span className="text-base font-bold text-white uppercase">
                      {user?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  {user?.name}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 pt-1">
                    <p className="text-sm text-slate-600">
                      {isManager ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <Shield className="w-4 h-4" />
                          Gestor
                        </span>
                      ) : (
                        <span className="text-slate-600">Funcionário</span>
                      )}
                    </p>
                    <div className="space-y-2">
                      <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                        style={{
                          background: 'rgba(226, 232, 240, 0.8)',
                          border: '1px solid rgba(203, 213, 225, 0.8)',
                        }}
                      >
                        <ClipboardCheck className="w-4 h-4 shrink-0 text-slate-600" />
                        <span className="font-semibold text-slate-800">
                          {taskStats === null ? '…' : taskStats.active}
                        </span>
                        <span className="text-slate-600">
                          tarefa{taskStats && taskStats.active !== 1 ? 's' : ''} ativa{taskStats && taskStats.active !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                        style={{
                          background: 'rgba(226, 232, 240, 0.8)',
                          border: '1px solid rgba(203, 213, 225, 0.8)',
                        }}
                      >
                        <BadgeCheck className="w-4 h-4 shrink-0 text-slate-600" />
                        <span className="font-semibold text-slate-800">
                          {taskStats === null ? '…' : taskStats.completed}
                        </span>
                        <span className="text-slate-600">
                          tarefa{taskStats && taskStats.completed !== 1 ? 's' : ''} concluída{taskStats && taskStats.completed !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                        style={{
                          background: 'rgba(254, 226, 226, 0.6)',
                          border: '1px solid rgba(252, 165, 165, 0.8)',
                        }}
                      >
                        <CalendarCheck className="w-4 h-4 shrink-0 text-red-600" />
                        <span className="font-semibold text-slate-800">
                          {taskStats === null ? '…' : taskStats.overdue}
                        </span>
                        <span className="text-slate-600">
                          tarefa{taskStats && taskStats.overdue !== 1 ? 's' : ''} atrasada{taskStats && taskStats.overdue !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};

export default Header;
