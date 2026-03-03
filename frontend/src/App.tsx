import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Clock, Loader2, AlertCircle, RefreshCw,
  LogOut, Pencil, Trash2, Bell, XIcon,
  LayoutDashboard, Shield, CalendarCheck, Repeat, UserCircle, AlertTriangle,
  BadgeCheck, Users, FileSearch, ClipboardCheck,
} from 'lucide-react';
import { TaskStatus, statusConfig } from '@/types/task';
import { User } from '@/types/user';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { userApi, overdueApi, OverdueAlert } from '@/services/api';
import LoginPage from '@/components/LoginPage';
import UserManagement from '@/components/UserManagement';
import AuditLogView from '@/components/AuditLogView';
import EditTaskDialog from '@/components/EditTaskDialog';
import CompletedTasksPage from '@/components/CompletedTasksPage';
import type { Task } from '@/types/task';

/** Troféu 3D em acrílico translúcido branco */
const Trophy3D: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 120 140"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Gradiente principal do corpo – acrílico branco */}
      <linearGradient id="cup3d" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
        <stop offset="35%" stopColor="rgba(255,255,255,0.50)" />
        <stop offset="65%" stopColor="rgba(220,240,230,0.35)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.60)" />
      </linearGradient>

      {/* Reflexo lateral esquerdo – faixa de brilho */}
      <linearGradient id="shineLeft" x1="0" y1="0" x2="1" y2="0.5">
        <stop offset="0%" stopColor="rgba(255,255,255,0.90)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>

      {/* Gradiente da base */}
      <linearGradient id="base3d" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
        <stop offset="100%" stopColor="rgba(200,220,210,0.4)" />
      </linearGradient>

      {/* Gradiente das alças */}
      <linearGradient id="handle3d" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
        <stop offset="100%" stopColor="rgba(220,240,230,0.25)" />
      </linearGradient>

      {/* Gradiente do haste/caule */}
      <linearGradient id="stem3d" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
        <stop offset="50%" stopColor="rgba(255,255,255,0.35)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
      </linearGradient>

      {/* Sombra projetada */}
      <radialGradient id="shadow3d" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="rgba(0,0,0,0.12)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </radialGradient>

      {/* Brilho interior do copo */}
      <radialGradient id="innerGlow" cx="0.4" cy="0.3" r="0.6">
        <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>

    {/* Sombra no chão */}
    <ellipse cx="60" cy="136" rx="32" ry="4" fill="url(#shadow3d)" />

    {/* ── Base / Pedestal ── */}
    <path
      d="M36,126 L84,126 C84,126 82,132 60,132 C38,132 36,126 36,126Z"
      fill="url(#base3d)"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="0.8"
    />
    {/* Topo da base (elipse) */}
    <ellipse cx="60" cy="126" rx="24" ry="4" fill="url(#base3d)" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />

    {/* ── Haste ── */}
    <path
      d="M53,100 L53,122 C53,124 67,124 67,122 L67,100Z"
      fill="url(#stem3d)"
      stroke="rgba(255,255,255,0.4)"
      strokeWidth="0.6"
    />
    {/* Detalhe de nó decorativo */}
    <ellipse cx="60" cy="100" rx="9" ry="3" fill="url(#base3d)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />

    {/* ── Corpo do copo ── */}
    <path
      d="M30,18 C30,18 28,70 38,84 C44,92 53,97 60,97 C67,97 76,92 82,84 C92,70 90,18 90,18Z"
      fill="url(#cup3d)"
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="1"
    />

    {/* Brilho interior */}
    <path
      d="M34,22 C34,22 32,65 40,78 C45,85 54,90 60,90 C66,90 75,85 80,78 C88,65 86,22 86,22Z"
      fill="url(#innerGlow)"
    />

    {/* Reflexo principal – faixa de brilho esquerda */}
    <path
      d="M38,22 C38,22 35,60 42,76 C44,80 48,84 52,86 L46,86 C40,80 37,72 36,60 C34,42 37,22 38,22Z"
      fill="url(#shineLeft)"
      opacity="0.7"
    />

    {/* Reflexo secundário fino à direita */}
    <path
      d="M80,26 C80,26 82,50 78,68 L76,68 C80,50 79,26 80,26Z"
      fill="rgba(255,255,255,0.35)"
    />

    {/* Borda superior do copo (elipse) */}
    <ellipse cx="60" cy="18" rx="30" ry="6" fill="url(#cup3d)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
    {/* Brilho na borda */}
    <ellipse cx="52" cy="16.5" rx="16" ry="2.5" fill="rgba(255,255,255,0.4)" />

    {/* ── Alça esquerda ── */}
    <path
      d="M30,30 C14,30 10,52 14,62 C18,72 26,70 30,62"
      fill="none"
      stroke="url(#handle3d)"
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* Brilho na alça esquerda */}
    <path
      d="M29,33 C17,33 14,50 17,58 C19,64 25,64 28,58"
      fill="none"
      stroke="rgba(255,255,255,0.35)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* ── Alça direita ── */}
    <path
      d="M90,30 C106,30 110,52 106,62 C102,72 94,70 90,62"
      fill="none"
      stroke="url(#handle3d)"
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* Brilho na alça direita */}
    <path
      d="M91,33 C103,33 106,50 103,58 C101,64 95,64 92,58"
      fill="none"
      stroke="rgba(255,255,255,0.35)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Estrela central no corpo (decoração acrílica) */}
    <polygon
      points="60,42 63,52 74,52 66,58 69,68 60,62 51,68 54,58 46,52 57,52"
      fill="rgba(255,255,255,0.3)"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
  </svg>
);

const daysOfWeek = [
  { id: 'dom', label: 'Dom' },
  { id: 'seg', label: 'Seg' },
  { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' },
  { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' },
  { id: 'sab', label: 'Sáb' },
];

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

type Page = 'tasks' | 'users' | 'audit' | 'completed';

const App: React.FC = () => {
  const { user, loading: authLoading, logout, isManager } = useAuth();

  // Se não logado
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <TaskApp />;
};

const TaskApp: React.FC = () => {
  const { user, logout, isManager } = useAuth();
  const {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    changeStatus,
    deleteTask,
    clearError,
    refresh,
  } = useTasks();

  // Hook de notificações do Windows
  const { checkOverdueTasks, checkOverdueAlerts, requestPermission, isSupported, permission } = useNotifications();

  // Função de teste para notificações (temporária)
  const testNotification = useCallback(() => {
    if (!('Notification' in window)) {
      alert('Notificações não são suportadas neste navegador');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification('🧪 Teste de Notificação', {
        body: 'Esta é uma notificação de teste do sistema de gestão de tarefas.',
        icon: '/favicon.ico',
        tag: 'test-notification',
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('🧪 Teste de Notificação', {
            body: 'Permissão concedida! As notificações estão funcionando.',
            icon: '/favicon.ico',
            tag: 'test-notification',
          });
        } else {
          alert('Permissão de notificações negada. Por favor, habilite nas configurações do navegador.');
        }
      });
    } else {
      alert('Permissão de notificações negada. Por favor, habilite nas configurações do navegador.');
    }
  }, []);

  const [page, setPage] = useState<Page>('tasks');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [tempReason, setTempReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Novos campos de recorrência e horário
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimit, setTimeLimit] = useState('');

  // Atribuição (gestor)
  const [assignToId, setAssignToId] = useState<string>('');
  const [employees, setEmployees] = useState<User[]>([]);

  // Edição
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Confirmação de deleção
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Banner de alertas de tarefas atrasadas (da tabela overdue_alerts)
  const [overdueAlerts, setOverdueAlerts] = useState<OverdueAlert[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Buscar alertas ativos da API ao carregar tarefas
  useEffect(() => {
    if (!loading && tasks.length >= 0) {
      overdueApi.getActive()
        .then((alerts) => {
          setOverdueAlerts(alerts);
          setShowWelcome(alerts.length > 0);
        })
        .catch(() => setOverdueAlerts([]));
    }
  }, [loading, tasks.length]);

  // Verificar alertas periodicamente (a cada minuto) para detectar novas tarefas atrasadas
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      overdueApi.getActive()
        .then((alerts) => {
          setOverdueAlerts(alerts);
        })
        .catch(() => {});
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(interval);
  }, [loading]);


  // Fechar dropdown de notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Animação: cards sumindo e celebração
  const [fadingCards, setFadingCards] = useState<Set<number>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const hasUserCompletedRef = useRef(false); // rastreia se o usuário concluiu algo nesta sessão

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

  // Monitorar tarefas atrasadas e enviar notificações
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      checkOverdueTasks(tasks);
    }
  }, [tasks, loading, checkOverdueTasks, currentTime]); // Incluir currentTime para verificar quando horário muda

  // Monitorar alertas de overdue e enviar notificações
  useEffect(() => {
    if (!loading && overdueAlerts.length >= 0) {
      checkOverdueAlerts(overdueAlerts);
    }
  }, [overdueAlerts, loading, checkOverdueAlerts]);

  /** Verifica se uma tarefa está atrasada (horário limite ultrapassado OU flag isOverdue do backend) */
  const isTaskOverdue = useCallback(
    (task: Task): boolean => {
      // Tarefa concluída nunca mostra atrasada
      if (task.status === 'completed') return false;
      // Se o backend já marcou como atrasada (dia anterior), respeitar
      if (task.isOverdue) return true;
      // Verificar horário limite do dia atual
      if (task.timeLimit) {
        return currentTime >= task.timeLimit;
      }
      return false;
    },
    [currentTime],
  );

  // Helper: status terminal (tarefa finalizada — apenas "completed")
  const isTerminalStatus = useCallback(
    (status: TaskStatus) => status === 'completed',
    [],
  );

  // Carregar funcionários (se gestor)
  useEffect(() => {
    if (isManager) {
      userApi.getAll().then(setEmployees).catch(() => {});
    }
  }, [isManager]);

  // ─── Tarefas ativas (exclui concluídas, mas mantém as que estão fazendo fade-out) ─
  const activeTasks = tasks.filter(
    (t) => !isTerminalStatus(t.status) || fadingCards.has(t.id),
  );

  // ─── Detectar todas concluídas → celebração ──────────────────────
  useEffect(() => {
    if (loading || tasks.length === 0) return;
    if (!hasUserCompletedRef.current) return; // não celebrar no load inicial

    // Aguardar animações de fade-out terminarem antes de verificar
    if (fadingCards.size > 0) return;

    const activeCount = tasks.filter((t) => !isTerminalStatus(t.status)).length;
    if (activeCount === 0 && tasks.length > 0) {
      setShowCelebration(true);
      // Disparar confetti 🎉
      const duration = 3000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [tasks, fadingCards, loading, isTerminalStatus]);

  // ─── Banner: pendências do dia anterior (dados da tabela overdue_alerts) ──
  const buildPendingSummary = (): { title: string; lines: string[] } | null => {
    if (loading || overdueAlerts.length === 0) return null;

    const count = overdueAlerts.length;

    if (isManager) {
      const byEmployee: Record<string, number> = {};
      let unassigned = 0;

      for (const alert of overdueAlerts) {
        if (alert.user) {
          byEmployee[alert.user.name] = (byEmployee[alert.user.name] || 0) + 1;
        } else {
          unassigned++;
        }
      }

      const lines: string[] = [];
      for (const [name, c] of Object.entries(byEmployee)) {
        lines.push(`${name}: ${c} tarefa${c > 1 ? 's' : ''}`);
      }
      if (unassigned > 0) {
        lines.push(`Sem responsável: ${unassigned} tarefa${unassigned > 1 ? 's' : ''}`);
      }

      return {
        title: `${count} tarefa${count > 1 ? 's' : ''} pendente${count > 1 ? 's' : ''} do dia anterior`,
        lines,
      };
    } else {
      return {
        title: `Você possui ${count} tarefa${count > 1 ? 's' : ''} pendente${count > 1 ? 's' : ''} do dia anterior`,
        lines: overdueAlerts.map((a) => a.task.name),
      };
    }
  };

  // ─── Helpers de animação de fade-out (deve ficar antes dos early returns) ──
  const startFadeOut = useCallback((taskId: number) => {
    hasUserCompletedRef.current = true;
    setFadingCards((prev) => new Set(prev).add(taskId));
    // Remover da lista visível após a animação (850ms CSS)
    setTimeout(() => {
      setFadingCards((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 900);
  }, []);

  // Recarregar alertas de overdue (após resolver uma tarefa)
  const refreshOverdueAlerts = useCallback(() => {
    overdueApi.getActive()
      .then((alerts) => {
        setOverdueAlerts(alerts);
      })
      .catch(() => {});
  }, []);

  const pendingSummary = showWelcome ? buildPendingSummary() : null;

  // Sub-páginas
  if (page === 'users') return <UserManagement onBack={() => setPage('tasks')} onNavigate={setPage} />;
  if (page === 'audit') return <AuditLogView onBack={() => setPage('tasks')} onNavigate={setPage} />;
  if (page === 'completed') return <CompletedTasksPage onBack={() => setPage('tasks')} onNavigate={setPage} />;

  const resetDialog = () => {
    setNewTaskName('');
    setNewTaskDescription('');
    setIsRecurring(false);
    setSelectedDays([]);
    setHasTimeLimit(false);
    setTimeLimit('');
    setAssignToId('');
  };

  const handleAddTask = async () => {
    if (newTaskName.trim()) {
      try {
        setSaving(true);
        await addTask(newTaskName, 'pending', {
          description: newTaskDescription,
          isRecurring,
          recurringDays: isRecurring ? selectedDays : undefined,
          timeLimit: hasTimeLimit ? timeLimit : undefined,
          assignedToId: isManager && assignToId ? Number(assignToId) : undefined,
        });
        resetDialog();
        setIsDialogOpen(false);
      } catch {
        // erro já tratado pelo hook
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const handleStatusChange = (taskId: number, newStatus: TaskStatus) => {
    const config = statusConfig[newStatus];
    if (config.requiresReason) {
      setFlippedCard(taskId);
      setPendingStatus(newStatus);
      setTempReason('');
    } else {
      // Se é status terminal → animar saída
      if (isTerminalStatus(newStatus)) {
        startFadeOut(taskId);
      }
      changeStatus(taskId, newStatus).then(() => {
        // Se concluiu/não-executou, recarregar alertas
        if (isTerminalStatus(newStatus)) {
          refreshOverdueAlerts();
        }
      }).catch(() => {
        // reverter fade se falhou
        setFadingCards((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
      });
    }
  };

  const handleReasonSubmit = async (taskId: number) => {
    if (tempReason.trim() && pendingStatus) {
      try {
        setSaving(true);
        const shouldFade = isTerminalStatus(pendingStatus);
        await changeStatus(taskId, pendingStatus, tempReason);
        setFlippedCard(null);
        setPendingStatus(null);
        setTempReason('');
        // Iniciar fade-out DEPOIS do card virar de volta
        if (shouldFade) {
          setTimeout(() => startFadeOut(taskId), 200);
          refreshOverdueAlerts();
        }
      } catch {
        // erro já tratado pelo hook
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancelReason = () => {
    setFlippedCard(null);
    setPendingStatus(null);
    setTempReason('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      await deleteTask(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch {
      // erro tratado pelo hook
    } finally {
      setDeleting(false);
    }
  };

  /** Converte string "seg,qua,sex" em labels legíveis */
  const formatRecurringDays = (days: string | null | undefined): string => {
    if (!days) return '';
    const dayMap: Record<string, string> = {
      dom: 'Dom', seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb',
    };
    return days.split(',').map(d => dayMap[d] || d).join(', ');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════ Header Transparent Glass ═══════════ */}
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
              onClick={() => setPage('tasks')}
              className="flex items-center gap-3 group focus:outline-none"
              title="Voltar para Tarefas"
            >
              <div 
                className="flex items-center justify-center w-10 h-10 rounded-xl shadow-md group-hover:scale-105 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: `
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
                    0 2px 8px 0 rgba(0, 0, 0, 0.15)
                  `,
                }}
              >
                <LayoutDashboard className="w-5 h-5 text-white" />
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
              {/* Botão Tarefas (sempre ativo nesta página) */}
              <button
                onClick={() => setPage('tasks')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.3) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'rgba(0, 0, 0, 0.9)',
                  boxShadow: `
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                    0 1px 2px 0 rgba(0, 0, 0, 0.05)
                  `,
                }}
              >
                <CalendarCheck className="w-4 h-4" style={{ color: 'rgba(0, 0, 0, 0.8)' }} />
                <span className="hidden lg:inline">Tarefas</span>
              </button>

              {/* Concluídas */}
              <button
                onClick={() => setPage('completed')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: 'transparent',
                  color: 'rgba(0, 0, 0, 0.7)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)';
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.boxShadow = 'inset 0 1px 0 0 rgba(255, 255, 255, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.border = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <BadgeCheck className="w-4 h-4" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
                <span className="hidden lg:inline">Concluídas</span>
              </button>

              {/* Menu do gestor */}
              {isManager && (
                <>
                  <button
                    onClick={() => setPage('users')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: 'transparent',
                      color: 'rgba(0, 0, 0, 0.7)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)';
                      e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.boxShadow = 'inset 0 1px 0 0 rgba(255, 255, 255, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.border = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Users className="w-4 h-4" style={{ color: 'rgba(0, 0, 0, 0.8)' }} />
                    <span className="hidden lg:inline">Usuários</span>
                  </button>
                  <button
                    onClick={() => setPage('audit')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: 'transparent',
                      color: 'rgba(0, 0, 0, 0.7)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)';
                      e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.boxShadow = 'inset 0 1px 0 0 rgba(255, 255, 255, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.border = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <FileSearch className="w-4 h-4" style={{ color: 'rgba(0, 0, 0, 0.8)' }} />
                    <span className="hidden lg:inline">Auditoria</span>
                  </button>
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
                  {tasks.filter((t) => !isTerminalStatus(t.status)).length}
                </span>
                <span className="text-xs" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                  ativa{tasks.filter((t) => !isTerminalStatus(t.status)).length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Separador */}
              <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(0, 0, 0, 0.1)' }} />

              {/* Botão de teste de notificações (temporário) */}
              <button
                onClick={testNotification}
                className="relative p-1.5 rounded-lg transition-all duration-200"
                title={`🧪 Testar notificações (Status: ${isSupported ? (permission === 'granted' ? 'Ativo' : permission === 'denied' ? 'Negado' : 'Pendente') : 'Não suportado'})`}
                style={{
                  background: isSupported && permission === 'granted' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                  border: isSupported && permission === 'granted' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSupported && permission === 'granted' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.border = isSupported && permission === 'granted' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)';
                }}
              >
                <AlertCircle className="w-5 h-5" style={{ color: isSupported && permission === 'granted' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(59, 130, 246, 0.9)' }} />
              </button>
              
              {/* Separador */}
              <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(0, 0, 0, 0.1)' }} />

              {/* Overdue notification bell */}
              {overdueAlerts.length > 0 && (
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="relative p-1.5 rounded-lg transition-all duration-200"
                    title="Notificações de atraso"
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
                      className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{
                        background: 'rgba(220, 38, 38, 0.9)',
                        boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.6), 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      {overdueAlerts.length}
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
                      <div 
                        className="px-4 py-3 border-b"
                        style={{
                          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
                          borderColor: 'rgba(220, 38, 38, 0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'rgba(220, 38, 38, 0.8)' }} />
                          <h3 className="text-sm font-semibold" style={{ color: 'rgba(220, 38, 38, 0.9)' }}>
                            Tarefas Pendentes do Dia Anterior
                          </h3>
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: 'rgba(220, 38, 38, 0.75)' }}>
                          {overdueAlerts.length} tarefa{overdueAlerts.length !== 1 ? 's' : ''} pendente{overdueAlerts.length !== 1 ? 's' : ''} do dia anterior
                        </p>
                      </div>
                      <div className="max-h-80 overflow-y-auto" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        {overdueAlerts.slice(0, 10).map((alert) => (
                          <div 
                            key={alert.id} 
                            className="px-4 py-3 transition-colors"
                            style={{
                              borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-3 h-3 mt-1.5 shrink-0" style={{ color: 'rgba(220, 38, 38, 0.7)' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'rgba(0, 0, 0, 0.85)' }}>
                                  {alert.task.name}
                                </p>
                                {alert.task.description && (
                                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                                    {alert.task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {alert.user && (
                                    <span 
                                      className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: 'rgba(0, 0, 0, 0.7)',
                                        boxShadow: `
                                          inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                                          0 1px 2px 0 rgba(0, 0, 0, 0.05)
                                        `,
                                      }}
                                    >
                                      <UserCircle className="w-2.5 h-2.5" />
                                      {alert.user.name}
                                    </span>
                                  )}
                                  {alert.task.timeLimit && (
                                    <span 
                                      className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: 'rgba(59, 130, 246, 0.8)',
                                        boxShadow: `
                                          inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                                          0 1px 2px 0 rgba(0, 0, 0, 0.05)
                                        `,
                                      }}
                                    >
                                      <Clock className="w-2.5 h-2.5" />
                                      {alert.task.timeLimit}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {overdueAlerts.length > 10 && (
                          <div 
                            className="px-4 py-2 text-center"
                            style={{
                              background: 'rgba(255, 255, 255, 0.3)',
                              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                            }}
                          >
                            <p className="text-xs" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                              + {overdueAlerts.length - 10} tarefa{overdueAlerts.length - 10 !== 1 ? 's' : ''} adicional{overdueAlerts.length - 10 !== 1 ? 'is' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                      <div 
                        className="px-4 py-2 border-t"
                        style={{
                          background: 'rgba(255, 255, 255, 0.3)',
                          borderColor: 'rgba(0, 0, 0, 0.08)',
                        }}
                      >
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            // Scroll até a seção de pendências
                            const overdueSection = document.querySelector('[data-section="overdue"]');
                            if (overdueSection) {
                              overdueSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className="w-full text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          style={{ color: 'rgba(220, 38, 38, 0.8)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'rgba(220, 38, 38, 1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(220, 38, 38, 0.8)';
                          }}
                        >
                          Ver todas as pendências
                          <span className="text-[10px]">↓</span>
                        </button>
                      </div>
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

              {/* Sair */}
              <button
                onClick={logout}
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
                <span className="hidden lg:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mensagem de erro */}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(239, 68, 68, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)';
              }}
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Banner de pendências do dia anterior - Liquid Glass */}
      {pendingSummary && !loading && (
        <div className="container mx-auto px-4 pt-4">
          <div 
            className="relative flex items-start gap-3 p-4 rounded-lg"
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
              color: 'rgba(220, 38, 38, 0.85)',
            }}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'rgba(220, 38, 38, 0.8)' }} />
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: 'rgba(220, 38, 38, 0.9)' }}>{pendingSummary.title}</p>
              {pendingSummary.lines.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {pendingSummary.lines.map((line, i) => (
                    <li key={i} className="text-sm" style={{ color: 'rgba(220, 38, 38, 0.75)' }}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowWelcome(false);
                overdueApi.acknowledgeAll().catch(() => {});
              }}
              className="h-7 w-7 p-0 shrink-0"
              style={{
                color: 'rgba(220, 38, 38, 0.7)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(220, 38, 38, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(220, 38, 38, 0.7)';
              }}
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando tarefas...</p>
          </div>
        </div>
      )}

      {/* Seção: Pendências do dia anterior (cards completos) */}
      {!loading && overdueAlerts.length > 0 && (
        <div className="container mx-auto px-4 pt-6 pb-2" data-section="overdue">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500/60" />
            <h2 className="text-lg font-bold text-foreground">
              Pendências do dia anterior
            </h2>
            <Badge 
              variant="outline"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: 'rgba(220, 38, 38, 0.75)',
                boxShadow: `
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                  0 0 0 1px rgba(255, 255, 255, 0.15),
                  0 0 10px rgba(255, 255, 255, 0.08),
                  0 2px 8px 0 rgba(0, 0, 0, 0.06),
                  0 1px 4px 0 rgba(0, 0, 0, 0.04),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.04)
                `,
              }}
            >
              {overdueAlerts.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {overdueAlerts.map((alert) => {
              const task = alert.task;
              const config = statusConfig[task.status as TaskStatus];
              const isFlipped = flippedCard === task.id;
              const isFading = fadingCards.has(task.id);
              if (!config) return null;
              return (
                <div
                  key={`overdue-${alert.id}`}
                  className={`relative h-full ${isFading ? 'fade-out-pulse' : ''}`}
                  style={{ perspective: '1000px' }}
                >
                  <div
                    className={`relative w-full h-full transition-transform duration-500 ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Front of card - Liquid Glass */}
                    <Card
                      className="h-full flex flex-col transition-all duration-200 cursor-pointer group backface-hidden overflow-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        pointerEvents: isFlipped ? 'none' : 'auto',
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
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                          0 0 0 1px rgba(255, 255, 255, 0.25),
                          0 0 25px rgba(255, 255, 255, 0.15),
                          0 8px 24px 0 rgba(0, 0, 0, 0.1),
                          0 2px 8px 0 rgba(0, 0, 0, 0.06),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.06)
                        `;
                        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = `
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                          0 0 0 1px rgba(255, 255, 255, 0.15),
                          0 0 20px rgba(255, 255, 255, 0.1),
                          0 4px 16px 0 rgba(0, 0, 0, 0.08),
                          0 1px 4px 0 rgba(0, 0, 0, 0.04),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)
                        `;
                        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.25)';
                      }}
                    >
                      {/* Tarja: Pendência anterior - Vermelha com borda 3D */}
                      <div className="absolute top-0 left-0 pointer-events-none z-10" style={{ width: '150px', height: '150px', overflow: 'hidden' }}>
                        <div 
                          className="absolute text-white text-[10px] py-1 tracking-wide leading-none" 
                          style={{
                            fontWeight: 800,
                            fontFamily: 'system-ui, -apple-system, sans-serif', 
                            top: '26px', 
                            left: '-56px', 
                            width: '180px', 
                            transform: 'rotate(-45deg)', 
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.95) 0%, rgba(239, 68, 68, 0.95) 100%)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: `
                              inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                              inset 0 -1px 0 0 rgba(0, 0, 0, 0.15),
                              inset 1px 0 0 0 rgba(255, 255, 255, 0.3),
                              inset -1px 0 0 0 rgba(0, 0, 0, 0.12),
                              0 0 0 1px rgba(255, 255, 255, 0.2)
                            `,
                          }}
                        >
                          DIA ANTERIOR
                        </div>
                      </div>

                      {/* Botões editar/deletar (gestor) - Liquid Glass */}
                      {isManager && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); setEditTask(task); }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
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
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(task); }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: 'rgba(239, 68, 68, 0.7)',
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
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                              e.currentTarget.style.color = 'rgba(239, 68, 68, 0.9)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                              e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)';
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      <CardHeader className="pb-3 pt-8">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold line-clamp-2 flex-1 min-h-[2lh]">
                            {task.name}
                          </CardTitle>
                          <Badge 
                            variant="outline" 
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: `rgba(${getStatusColorRGB(task.status)}, 0.6)`,
                              boxShadow: `
                                inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                0 1px 4px 0 rgba(0, 0, 0, 0.06)
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

                        {task.assignedTo && isManager && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: 'rgba(71, 85, 105, 0.6)',
                              boxShadow: `
                                inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                0 1px 4px 0 rgba(0, 0, 0, 0.06)
                              `,
                            }}
                          >
                            <UserCircle className="w-3 h-3" />
                            {task.assignedTo.name}
                          </Badge>
                        )}

                        {(task.isRecurring || task.timeLimit) && (
                          <div className="flex flex-wrap gap-1.5">
                            {task.isRecurring && task.recurringDays && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs gap-1"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  backdropFilter: 'blur(12px)',
                                  WebkitBackdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: 'rgba(37, 99, 235, 0.7)',
                                  boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                    inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                    inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                    0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                    0 1px 4px 0 rgba(0, 0, 0, 0.06)
                                  `,
                                }}
                              >
                                <Repeat className="w-3 h-3" />
                                {formatRecurringDays(task.recurringDays)}
                              </Badge>
                            )}
                            {task.timeLimit && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs gap-1"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  backdropFilter: 'blur(12px)',
                                  WebkitBackdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: 'rgba(37, 99, 235, 0.75)',
                                  boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                    inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                    inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                    0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                    0 1px 4px 0 rgba(0, 0, 0, 0.06)
                                  `,
                                }}
                              >
                                <Clock className="w-3 h-3" />
                                {task.timeLimit}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Espaçador flexível para empurrar motivo e select para baixo */}
                        <div className="flex-1" />

                        <div className="min-h-[40px]">
                          {task.reason && (
                            <div className={`p-2 rounded-md text-xs ${config.bgLight} ${config.textColor}`}>
                              <span className="font-semibold">Motivo: </span>{task.reason}
                            </div>
                          )}
                        </div>
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <span className="text-sm">{config.label}</span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, statusConf]) => (
                              <SelectItem key={key} value={key}>
                                {statusConf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Back of card (reason input) - Liquid Glass */}
                    {isFlipped && (
                      <Card
                        className="absolute inset-0 w-full backface-hidden"
                        style={{
                          transform: 'rotateY(180deg)',
                          backfaceVisibility: 'hidden',
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
                        <CardHeader>
                          <CardTitle className="text-base">Informe o Motivo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Motivo:</label>
                            <Input
                              placeholder="Digite o motivo..."
                              value={tempReason}
                              onChange={(e) => setTempReason(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleReasonSubmit(task.id);
                                }
                              }}
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
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReasonSubmit(task.id)}
                              className="flex-1"
                              disabled={!tempReason.trim() || saving}
                              style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
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
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.25)';
                              }}
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Confirmar'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancelReason}
                              className="flex-1"
                              style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: 'rgba(15, 23, 42, 0.8)',
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
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Separador entre seções quando há overdue */}
      {!loading && overdueAlerts.length > 0 && activeTasks.length > 0 && (
        <div className="container mx-auto px-4">
          <hr className="border-border" />
        </div>
      )}

      {/* Tasks Grid — Tarefas do Dia */}
      {!loading && (
        <div className="container mx-auto px-4 py-8">
          {/* Botão Nova Tarefa - Área de conteúdo */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-foreground">
                {activeTasks.length > 0 || overdueAlerts.length > 0 ? 'Tarefas de Hoje' : 'Minhas Tarefas'}
              </h2>
              {activeTasks.length > 0 && (
                <Badge 
                  variant="outline"
                  style={{
                    background: 'rgba(96, 165, 250, 0.12)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(96, 165, 250, 0.25)',
                    color: 'rgba(37, 99, 235, 0.75)',
                  }}
                >
                  {activeTasks.length}
                </Badge>
              )}
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetDialog(); }}>
              <DialogTrigger asChild>
                <Button
                  size="default"
                  className="gap-2 transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
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
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.25)';
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Tarefa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Nome */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome da Tarefa</label>
                    <Input
                      placeholder="Digite o nome da tarefa"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
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

                  {/* Descrição */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição (opcional)</label>
                    <Input
                      placeholder="Breve descrição da tarefa"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
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

                  {/* Atribuição (gestor) */}
                  {isManager && employees.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Atribuir a</label>
                      <Select value={assignToId} onValueChange={setAssignToId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um funcionário" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={String(emp.id)}>{emp.name} ({emp.role === 'manager' ? 'Gestor' : 'Funcionário'})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Tarefa Recorrente */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Tarefa Recorrente</label>
                    <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                  </div>

                  {isRecurring && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dias da Semana</label>
                      <div className="grid grid-cols-7 gap-2">
                        {daysOfWeek.map((day) => (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleDay(day.id)}
                            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              selectedDays.includes(day.id)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Horário Limite */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Definir Horário Limite</label>
                    <Switch checked={hasTimeLimit} onCheckedChange={setHasTimeLimit} />
                  </div>

                  {hasTimeLimit && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Horário Limite</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                        <Input
                          type="time"
                          value={timeLimit}
                          onChange={(e) => setTimeLimit(e.target.value)}
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
                      <p className="text-xs text-muted-foreground">
                        Tarefas não concluídas até este horário serão marcadas como atrasadas
                      </p>
                    </div>
                  )}

                  {/* Botão criar */}
                  <Button onClick={handleAddTask} className="w-full" disabled={saving || !newTaskName.trim()}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Adicionar Tarefa'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {activeTasks.map((task) => {
              const config = statusConfig[task.status];
              const isFlipped = flippedCard === task.id;
              const isFading = fadingCards.has(task.id);
              return (
                <div
                  key={task.id}
                  className={`relative h-full ${isFading ? 'fade-out-pulse' : ''}`}
                  style={{ perspective: '1000px' }}
                >
                  <div
                    className={`relative w-full h-full transition-transform duration-500 ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Front of card - Transparent Glass */}
                    <Card
                      className="h-full flex flex-col transition-all duration-200 cursor-pointer group backface-hidden overflow-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        pointerEvents: isFlipped ? 'none' : 'auto',
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
                      {/* Tarja Diagonal - Atrasado (isOverdue do backend OU horário limite ultrapassado) */}
                      {isTaskOverdue(task) && (
                        <div className="absolute top-0 left-0 pointer-events-none z-10" style={{ width: '150px', height: '150px', overflow: 'hidden' }}>
                          <div 
                            className="absolute text-white text-[10px] py-1 tracking-wide leading-none" 
                            style={{ 
                              top: '26px', 
                              left: '-56px', 
                              width: '180px', 
                              transform: 'rotate(-45deg)', 
                              textAlign: 'center',
                              fontWeight: 800,
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.95) 0%, rgba(239, 68, 68, 0.95) 100%)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              boxShadow: `
                                inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                inset 0 -1px 0 0 rgba(0, 0, 0, 0.15),
                                inset 1px 0 0 0 rgba(255, 255, 255, 0.3),
                                inset -1px 0 0 0 rgba(0, 0, 0, 0.12),
                                0 0 0 1px rgba(255, 255, 255, 0.2)
                              `,
                            }}
                          >
                            ATRASADO
                          </div>
                        </div>
                      )}

                      {/* Botões editar/deletar (gestor) - Liquid Glass */}
                      {isManager && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); setEditTask(task); }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
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
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(task); }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: 'rgba(239, 68, 68, 0.7)',
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
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                              e.currentTarget.style.color = 'rgba(239, 68, 68, 0.9)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                              e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)';
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      <CardHeader className={`pb-3 ${isTaskOverdue(task) ? 'pt-8' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold line-clamp-2 flex-1 min-h-[2lh]">
                            {task.name}
                          </CardTitle>
                          <Badge 
                            variant="outline" 
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: `rgba(${getStatusColorRGB(task.status)}, 0.6)`,
                              boxShadow: `
                                inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                0 1px 4px 0 rgba(0, 0, 0, 0.06)
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
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: 'rgba(71, 85, 105, 0.6)',
                              boxShadow: `
                                inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                0 1px 4px 0 rgba(0, 0, 0, 0.06)
                              `,
                            }}
                          >
                            <UserCircle className="w-3 h-3" />
                            {task.assignedTo.name}
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
                                  backdropFilter: 'blur(12px)',
                                  WebkitBackdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: 'rgba(37, 99, 235, 0.7)',
                                  boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                    inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                    inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                    0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                    0 1px 4px 0 rgba(0, 0, 0, 0.06)
                                  `,
                                }}
                              >
                                <Repeat className="w-3 h-3" />
                                {formatRecurringDays(task.recurringDays)}
                              </Badge>
                            )}
                            {task.timeLimit && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs gap-1"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  backdropFilter: 'blur(12px)',
                                  WebkitBackdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: 'rgba(37, 99, 235, 0.75)',
                                  boxShadow: `
                                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.12),
                                    inset 1px 0 0 0 rgba(255, 255, 255, 0.35),
                                    inset -1px 0 0 0 rgba(0, 0, 0, 0.1),
                                    0 2px 8px 0 rgba(0, 0, 0, 0.1),
                                    0 1px 4px 0 rgba(0, 0, 0, 0.06)
                                  `,
                                }}
                              >
                                <Clock className="w-3 h-3" />
                                {task.timeLimit}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Espaçador flexível para empurrar motivo e select para baixo */}
                        <div className="flex-1" />

                        <div className="min-h-[40px]">
                          {task.reason && (
                            <div className={`p-2 rounded-md text-xs ${config.bgLight} ${config.textColor}`}>
                              <span className="font-semibold">Motivo: </span>{task.reason}
                            </div>
                          )}
                        </div>
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <span className="text-sm">{config.label}</span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, statusConf]) => (
                              <SelectItem key={key} value={key}>
                                {statusConf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Back of card (reason input) - Liquid Glass */}
                    {isFlipped && (
                      <Card
                        className="absolute inset-0 w-full backface-hidden"
                        style={{
                          transform: 'rotateY(180deg)',
                          backfaceVisibility: 'hidden',
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
                        }}
                      >
                        <CardHeader>
                          <CardTitle className="text-base">Informe o Motivo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Motivo:</label>
                            <Input
                              placeholder="Digite o motivo..."
                              value={tempReason}
                              onChange={(e) => setTempReason(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleReasonSubmit(task.id);
                                }
                              }}
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
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReasonSubmit(task.id)}
                              className="flex-1"
                              disabled={!tempReason.trim() || saving}
                              style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
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
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.25)';
                              }}
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Confirmar'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancelReason}
                              className="flex-1"
                              style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: 'rgba(15, 23, 42, 0.8)',
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
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Celebração: todas as tarefas concluídas! */}
          {showCelebration && (
            <div className="flex items-center justify-center py-16 celebration-fade-in">
              <div className="relative glass-card rounded-2xl px-10 py-12 text-center space-y-6 max-w-md w-full">
                {/* Brilhos decorativos */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-44 h-44 rounded-full bg-green-400/25 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-36 h-36 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

                {/* Troféu 3D acrílico */}
                <div className="trophy-3d-container relative inline-flex items-center justify-center mx-auto">
                  <div className="trophy-3d-float">
                    <Trophy3D className="w-32 h-36 drop-shadow-xl" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    Parabéns!
                  </h2>
                  <p className="text-muted-foreground text-base">
                    Todas as tarefas do dia foram concluídas!
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => { setShowCelebration(false); refresh(); }}
                  className="gap-2 glass-button"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recarregar Tarefas
                </Button>
              </div>
            </div>
          )}

          {/* Nenhuma tarefa encontrada (estado vazio, sem celebração) */}
          {!showCelebration && activeTasks.length === 0 && tasks.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground text-lg">
                Nenhuma tarefa encontrada. Crie sua primeira tarefa!
              </p>
              <Button variant="outline" onClick={refresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Recarregar
              </Button>
            </div>
          )}

          {/* Todas concluídas mas sem celebração ativa */}
          {!showCelebration && activeTasks.length === 0 && tasks.length > 0 && (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground text-lg">
                ✅ Todas as tarefas estão concluídas.
              </p>
              <Button variant="outline" onClick={refresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Recarregar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog de edição */}
      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => { if (!open) setEditTask(null); }}
        onSave={updateTask}
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
                onClick={handleDelete}
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

export default App;
