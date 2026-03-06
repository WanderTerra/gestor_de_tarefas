import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, ArrowLeft, CheckCircle2, Clock, AlertCircle, XCircle, PlayCircle,
  Pencil, Trash2, ChevronDown,
} from 'lucide-react';
import { Task, statusConfig, TaskStatus } from '@/types/task';
import { taskApi, userApi, UpdateTaskPayload } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import EditTaskDialog from '@/components/EditTaskDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User } from '@/types/user';

interface AllTasksPageProps {
  onBack: () => void;
  onNavigate?: (page: 'tasks' | 'completed' | 'users' | 'audit' | 'authorization-requests' | 'all-tasks') => void;
}

/** Helper para obter cor RGB do status para badges */
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

const AllTasksPage: React.FC<AllTasksPageProps> = ({ onBack, onNavigate }) => {
  const { isManager } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<User[]>([]);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());

  // Carregar tarefas
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const data = await taskApi.getAll();
        setTasks(data);
      } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  // Carregar funcionários (apenas para gestores, para edição)
  useEffect(() => {
    if (!isManager) return; // Usuários comuns não têm permissão para listar usuários
    
    const loadEmployees = async () => {
      try {
        const data = await userApi.getAll();
        setEmployees(data);
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
      }
    };
    loadEmployees();
  }, [isManager]);

  // Agrupar tarefas por status
  const groupedByStatus = tasks.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(task);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  // Ordenar status: ativas primeiro, depois concluídas
  const statusOrder: TaskStatus[] = ['pending', 'in-progress', 'waiting', 'completed', 'not-executed'];
  const sortedStatuses = statusOrder.filter(status => groupedByStatus[status]?.length > 0);

  const toggleStatusCollapsed = useCallback((status: string) => {
    setCollapsedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const handleUpdateTask = async (id: number, data: UpdateTaskPayload) => {
    try {
      const updated = await taskApi.update(id, data);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      setEditTask(null);
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      throw error;
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      await taskApi.delete(deleteConfirm.id);
      setTasks(prev => prev.filter(t => t.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleNavigate = (navPage: 'tasks' | 'users' | 'audit' | 'completed' | 'authorization-requests' | 'all-tasks') => {
    if (navPage === 'all-tasks') {
      return; // Já estamos na página todas
    }
    if (onNavigate) {
      onNavigate(navPage);
    }
  };

  const getCurrentPage = (): 'tasks' | 'users' | 'audit' | 'completed' | 'authorization-requests' | 'all-tasks' => {
    return 'all-tasks';
  };

  const isTerminalStatus = (status: TaskStatus): boolean => {
    return status === 'completed' || status === 'not-executed';
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in-progress':
        return <PlayCircle className="w-4 h-4" />;
      case 'waiting':
        return <AlertCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'not-executed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    return statusConfig[status].label;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          currentPage={getCurrentPage()}
          onNavigate={handleNavigate}
          tasks={tasks}
          isTerminalStatus={isTerminalStatus}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentPage={getCurrentPage()}
        onNavigate={handleNavigate}
        tasks={tasks}
        isTerminalStatus={isTerminalStatus}
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Cabeçalho */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Todas as Tarefas</h1>
              <p className="text-muted-foreground mt-1">
                Visualize todas as suas tarefas em um único lugar
              </p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {statusOrder.map((status) => {
            const count = groupedByStatus[status]?.length || 0;
            if (count === 0) return null;
            return (
              <Card key={status} className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: `rgba(${getStatusColorRGB(status)}, 0.1)`,
                    }}
                  >
                    {getStatusIcon(status)}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{getStatusLabel(status)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Lista de tarefas agrupadas por status */}
        <div className="space-y-6">
          {sortedStatuses.map((status) => {
            const statusTasks = groupedByStatus[status];
            const isCollapsed = collapsedStatuses.has(status);
            const statusKey = status;

            return (
              <div key={statusKey} className="mb-6">
                {/* Cabeçalho do status */}
                <button
                  onClick={() => toggleStatusCollapsed(statusKey)}
                  className="w-full flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:bg-accent transition-colors mb-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: `rgba(${getStatusColorRGB(status)}, 0.1)`,
                      }}
                    >
                      {getStatusIcon(status)}
                    </div>
                    <div className="text-left">
                      <h2 className="font-bold text-lg">{getStatusLabel(status)}</h2>
                      <p className="text-sm text-muted-foreground">
                        {statusTasks.length} {statusTasks.length === 1 ? 'tarefa' : 'tarefas'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                      isCollapsed ? '' : 'rotate-180'
                    }`}
                  />
                </button>

                {/* Tarefas do status */}
                {!isCollapsed && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {statusTasks.map((task) => (
                      <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-lg flex-1">{task.name}</h3>
                            {isManager && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditTask(task)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(task)}
                                  className="h-8 w-8 p-0 text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              style={{
                                backgroundColor: `rgba(${getStatusColorRGB(task.status)}, 0.15)`,
                                color: `rgb(${getStatusColorRGB(task.status)})`,
                                border: `1px solid rgba(${getStatusColorRGB(task.status)}, 0.3)`,
                              }}
                            >
                              {statusConfig[task.status].label}
                            </Badge>
                            {task.isOverdue && (
                              <Badge variant="destructive">Atrasada</Badge>
                            )}
                            {task.isRecurring && (
                              <Badge variant="outline">Recorrente</Badge>
                            )}
                          </div>

                          {task.timeLimit && (
                            <p className="text-xs text-muted-foreground">
                              Limite: {task.timeLimit}
                            </p>
                          )}

                          {task.deadline && (
                            <p className="text-xs text-muted-foreground">
                              Prazo: {new Date(task.deadline).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sortedStatuses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
          </div>
        )}
      </div>

      {/* Dialog de edição */}
      {editTask && (
        <EditTaskDialog
          task={editTask}
          open={!!editTask}
          onOpenChange={(open) => !open && setEditTask(null)}
          onSave={handleUpdateTask}
          employees={employees}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Tem certeza que deseja excluir a tarefa "{deleteConfirm.name}"?</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteTask} disabled={deleting}>
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AllTasksPage;
