import React, { useRef, useState, useEffect } from 'react';
import { 
  CalendarCheck, BadgeCheck, Users, UserPlus, FileSearch, 
  Bell, LogOut, ClipboardCheck, Shield
} from 'lucide-react';
import { useButtonInteraction } from '@/hooks/useButtonInteraction';
import { useAuth } from '@/contexts/AuthContext';
import { overdueApi, OverdueAlert, authApi } from '@/services/api';
import { User } from '@/types/user';
import { Task, TaskStatus } from '@/types/task';

type Page = 'tasks' | 'users' | 'audit' | 'completed' | 'authorization-requests';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  tasks?: Task[];
  isTerminalStatus?: (status: TaskStatus) => boolean;
}

// Helper para verificar se status é terminal
const defaultIsTerminalStatus = (status: string): boolean => {
  return status === 'completed' || status === 'not-executed';
};

/** Componente de botão de navegação com interações visuais */
const NavButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  icon: React.ReactNode;
  label: string;
}> = ({ onClick, isActive = false, icon, label }) => {
  const buttonInteraction = useButtonInteraction(onClick, {
    rippleColor: 'rgba(255, 255, 255, 0.9)',
    scaleOnClick: 0.90,
    rippleDuration: 800,
    scaleDuration: 200,
  });

  return (
    <button
      {...buttonInteraction}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.3) 100%)'
          : 'transparent',
        border: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
        color: isActive ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.7)',
        boxShadow: isActive
          ? `inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.05)`
          : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)';
          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
          e.currentTarget.style.boxShadow = 'inset 0 1px 0 0 rgba(255, 255, 255, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.border = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, tasks = [], isTerminalStatus }) => {
  const { logout, isManager, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [overdueAlerts, setOverdueAlerts] = useState<OverdueAlert[]>([]);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

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

  const checkIsTerminal = isTerminalStatus 
    ? (status: string) => isTerminalStatus(status as TaskStatus)
    : defaultIsTerminalStatus;
  const activeTasksCount = tasks.filter((t) => !checkIsTerminal(t.status)).length;

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
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          {/* ── Lado esquerdo: Logo + título (clicável) ── */}
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

          {/* ── Centro: Navegação (botões agrupados) ── */}
          <nav className="flex items-center gap-0.5">
            <NavButton
              onClick={() => onNavigate('tasks')}
              isActive={currentPage === 'tasks'}
              icon={<CalendarCheck className="w-4 h-4" style={{ color: 'rgba(0, 0, 0, 0.8)' }} />}
              label="Tarefas"
            />

            <NavButton
              onClick={() => onNavigate('completed')}
              isActive={currentPage === 'completed'}
              icon={<BadgeCheck className="w-4 h-4" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />}
              label="Concluídas"
            />

            {isManager && (
              <>
                <NavButton
                  onClick={() => onNavigate('users')}
                  isActive={currentPage === 'users'}
                  icon={<Users className="w-4 h-4" style={{ color: 'rgba(0, 0, 0, 0.8)' }} />}
                  label="Usuários"
                />
                <NavButton
                  onClick={() => onNavigate('authorization-requests')}
                  isActive={currentPage === 'authorization-requests'}
                  icon={<UserPlus className="w-4 h-4" style={{ color: 'rgba(0, 0, 0, 0.8)' }} />}
                  label="Solicitações"
                />
                <NavButton
                  onClick={() => onNavigate('audit')}
                  isActive={currentPage === 'audit'}
                  icon={<FileSearch className="w-4 h-4" style={{ color: 'rgba(0, 0, 0, 0.8)' }} />}
                  label="Auditoria"
                />
              </>
            )}
          </nav>

          {/* ── Lado direito: Contador + Notificações + Perfil + Sair ── */}
          <div className="flex items-center gap-3">
            {/* Contador de tarefas ativas */}
            <div 
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: `
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                  0 1px 2px 0 rgba(0, 0, 0, 0.05)
                `,
              }}
            >
              <ClipboardCheck className="w-3.5 h-3.5" style={{ color: 'rgba(0, 0, 0, 0.8)' }} />
              <span className="text-sm font-semibold" style={{ color: 'rgba(0, 0, 0, 0.9)' }}>
                {activeTasksCount}
              </span>
              <span className="text-xs" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                ativa{activeTasksCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Separador */}
            <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(0, 0, 0, 0.1)' }} />

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
            <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(0, 0, 0, 0.1)' }} />

            {/* Avatar + nome */}
            <div className="flex items-center gap-2.5">
              <div 
                className="flex items-center justify-center w-9 h-9 rounded-full shadow-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: `
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
                    0 2px 8px 0 rgba(0, 0, 0, 0.15)
                  `,
                }}
              >
                <span className="text-sm font-bold text-white uppercase">
                  {user?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight" style={{ color: 'rgba(0, 0, 0, 0.9)' }}>
                  {user?.name}
                </p>
                <div className="flex items-center gap-1">
                  {isManager ? (
                    <span 
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(255, 255, 255, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: 'rgba(0, 0, 0, 0.7)',
                        boxShadow: `
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                          0 1px 2px 0 rgba(0, 0, 0, 0.05)
                        `,
                      }}
                    >
                      <Shield className="w-2.5 h-2.5" />
                      Gestor
                    </span>
                  ) : (
                    <span className="text-[10px]" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>Funcionário</span>
                  )}
                </div>
              </div>
            </div>

            {/* Separador */}
            <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(0, 0, 0, 0.1)' }} />

            {/* Sair */}
            <button
              {...logoutButtonInteraction}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              title="Sair"
              style={{
                background: 'transparent',
                color: 'rgba(0, 0, 0, 0.6)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                e.currentTarget.style.color = 'rgba(220, 38, 38, 0.9)';
                e.currentTarget.style.border = '1px solid rgba(220, 38, 38, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(0, 0, 0, 0.6)';
                e.currentTarget.style.border = 'none';
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
