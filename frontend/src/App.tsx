import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Loader2, AlertCircle,
  CheckCircle2, XCircle,
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
import CompletedTasksPage from '@/components/CompletedTasksPage';
import AuthorizationRequestsPage from '@/components/AuthorizationRequestsPage';
import Header from '@/components/Header';
import type { Task } from '@/types/task';

type Page = 'tasks' | 'users' | 'audit' | 'completed' | 'register' | 'pending-approval' | 'authorization-requests';

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
  const { isManager } = useAuth();
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

  const { checkOverdueTasks, checkOverdueAlerts } = useNotifications();

  const [page, setPage] = useState<Page>('tasks');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimit, setTimeLimit] = useState('');
  const [assignToId, setAssignToId] = useState<string>('');
  const [employees, setEmployees] = useState<User[]>([]);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [overdueAlerts, setOverdueAlerts] = useState<OverdueAlert[]>([]);
  const [fadingCards, setFadingCards] = useState<Set<number>>(new Set());

  const daysOfWeek = [
    { id: 'sunday', label: 'Dom' },
    { id: 'monday', label: 'Seg' },
    { id: 'tuesday', label: 'Ter' },
    { id: 'wednesday', label: 'Qua' },
    { id: 'thursday', label: 'Qui' },
    { id: 'friday', label: 'Sex' },
    { id: 'saturday', label: 'Sáb' },
  ];

  const isTerminalStatus = useCallback(
    (status: TaskStatus) => status === 'completed' || status === 'not-executed',
    [],
  );

  const activeTasks = tasks.filter(
    (t) => !isTerminalStatus(t.status) || fadingCards.has(t.id),
  );

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
  }, [tasks, loading, checkOverdueTasks]);

  useEffect(() => {
    if (!loading && overdueAlerts.length >= 0) {
      checkOverdueAlerts(overdueAlerts);
    }
  }, [overdueAlerts, loading, checkOverdueAlerts]);

  const resetDialog = () => {
    setNewTaskName('');
    setNewTaskDescription('');
    setIsRecurring(false);
    setSelectedDays([]);
    setHasTimeLimit(false);
    setTimeLimit('');
    setAssignToId('');
    setIsDialogOpen(false);
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    setSaving(true);
    try {
      await addTask(newTaskName, 'pending', {
        description: newTaskDescription,
        isRecurring,
        recurringDays: isRecurring ? selectedDays : undefined,
        timeLimit: hasTimeLimit ? timeLimit : undefined,
        assignedToId: assignToId ? Number(assignToId) : undefined,
      });
      resetDialog();
    } catch (err) {
      console.error('Erro ao adicionar tarefa:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleStatusChange = useCallback(async (taskId: number, newStatus: TaskStatus) => {
    if (newStatus === 'not-executed' || newStatus === 'waiting') {
      setFlippedCard(taskId);
    } else {
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

  const handleNavigate = (navPage: 'tasks' | 'users' | 'audit' | 'completed' | 'authorization-requests') => {
    setPage(navPage);
  };

  const getCurrentPage = (): 'tasks' | 'users' | 'audit' | 'completed' | 'authorization-requests' => {
    if (page === 'tasks') return 'tasks';
    if (page === 'completed') return 'completed';
    if (page === 'users') return 'users';
    if (page === 'audit') return 'audit';
    if (page === 'authorization-requests') return 'authorization-requests';
    return 'tasks';
  };

  if (page === 'users') return <UserManagement onBack={() => setPage('tasks')} onNavigate={setPage} />;
  if (page === 'audit') return <AuditLogView onBack={() => setPage('tasks')} onNavigate={setPage} />;
  if (page === 'completed') return <CompletedTasksPage onBack={() => setPage('tasks')} onNavigate={setPage} />;
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
              ✕
            </Button>
          </div>
        </div>
      )}

      {!loading && page === 'tasks' && (
        <div className="container mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-end">
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetDialog(); }}>
              <DialogTrigger asChild>
                <Button size="default" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Tarefa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome da Tarefa</label>
                    <Input
                      placeholder="Digite o nome da tarefa"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição (opcional)</label>
                    <Input
                      placeholder="Breve descrição da tarefa"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                    />
                  </div>
                  {isManager && employees.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Atribuir a</label>
                      <Select value={assignToId} onValueChange={setAssignToId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um funcionário" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={String(emp.id)}>{emp.name} ({getRoleLabel(emp.role)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Definir Horário Limite</label>
                    <Switch checked={hasTimeLimit} onCheckedChange={setHasTimeLimit} />
                  </div>
                  {hasTimeLimit && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Horário Limite</label>
                      <Input
                        type="time"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(e.target.value)}
                      />
                    </div>
                  )}
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
        </div>
      )}

      {loading && page === 'tasks' && (
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando tarefas...</p>
          </div>
        </div>
      )}

      {!loading && activeTasks.length === 0 && page === 'tasks' && (
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500/60" />
            <h3 className="text-xl font-bold text-foreground">
              Nenhuma tarefa ativa encontrada
            </h3>
            <p className="text-muted-foreground max-w-md">
              Parece que você não tem tarefas ativas no momento. Que tal criar uma nova?
            </p>
          </div>
        </div>
      )}

      {!loading && activeTasks.length > 0 && page === 'tasks' && (
        <div className="container mx-auto px-4 pt-6 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {activeTasks.map((task) => {
              const config = statusConfig[task.status as TaskStatus];
              const isFlipped = flippedCard === task.id;
              const isFading = fadingCards.has(task.id);
              if (!config) return null;
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
                    <Card className="h-full flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">{task.name}</CardTitle>
                        <Badge>{config.label}</Badge>
                      </CardHeader>
                      <CardContent>
                        {task.description && (
                          <p className="text-sm text-slate-600">{task.description}</p>
                        )}
                        <div className="mt-4 flex justify-end gap-2">
                          {!isTerminalStatus(task.status) && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleStatusChange(task.id, 'completed')}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Concluir
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(task.id, 'not-executed')}
                              >
                                <XCircle className="w-4 h-4" />
                                Não Executar
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => { if (!open) setEditTask(null); }}
        onSave={updateTask}
        employees={employees}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
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
