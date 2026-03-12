import { useEffect, useRef, useCallback, useState } from 'react';
import { Task } from '@/types/task';
import { OverdueAlert, authApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar notificações do Windows (via API de Notificações do navegador)
 * Monitora tarefas atrasadas e envia notificações para administradores e usuários
 */
export function useNotifications() {
  const { user, isManager } = useAuth();
  const previousTasksRef = useRef<Map<number, boolean>>(new Map());
  const previousAlertsRef = useRef<Set<number>>(new Set());
  /** Na primeira execução só preenchemos o estado anterior, sem notificar (evita spam ao carregar a página). */
  const hasInitializedOverdueCheckRef = useRef(false);
  
  // Usar estado para garantir que os valores sejam atualizados
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return 'Notification' in window && typeof window.Notification !== 'undefined';
    } catch {
      return false;
    }
  });
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined') return 'denied';
    try {
      return 'Notification' in window && typeof window.Notification !== 'undefined' 
        ? window.Notification.permission 
        : 'denied';
    } catch {
      return 'denied';
    }
  });

  // Solicitar permissão de notificações
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return false;
    }
    
    try {
      if (!('Notification' in window) || typeof window.Notification === 'undefined') {
        console.warn('Notificações não são suportadas neste navegador');
        return false;
      }

      if (window.Notification.permission === 'granted') {
        setPermission('granted');
        return true;
      }

      if (window.Notification.permission === 'default') {
        try {
          const newPermission = await window.Notification.requestPermission();
          setPermission(newPermission);
          return newPermission === 'granted';
        } catch (error) {
          console.error('Erro ao solicitar permissão de notificações:', error);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao acessar API de Notificações:', error);
      return false;
    }
  }, []);

  // Verificar permissão ao montar o componente
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      if ('Notification' in window && typeof window.Notification !== 'undefined') {
        setPermission(window.Notification.permission);
        
        // Solicitar permissão automaticamente se ainda não foi solicitada
        if (window.Notification.permission === 'default' && user) {
          // Aguardar um pouco antes de solicitar para não ser intrusivo
          const timer = setTimeout(() => {
            requestPermission();
          }, 2000);
          return () => clearTimeout(timer);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar permissão de notificações:', error);
    }
  }, [user, requestPermission]);

  // Enviar notificação
  const sendNotification = useCallback(
    (title: string, options: NotificationOptions) => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        if (!('Notification' in window) || typeof window.Notification === 'undefined') {
          return;
        }

        if (window.Notification.permission !== 'granted') {
          console.log('Permissão de notificações não concedida');
          return;
        }

        const notification = new window.Notification(title, {
          ...options,
          icon: '/favicon.ico', // Ícone da aplicação
          badge: '/favicon.ico',
          requireInteraction: false, // Não requer interação para não ser intrusivo
          silent: false, // Tocar som
        });

        // Fechar automaticamente após 5 segundos
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Ao clicar na notificação, focar na janela
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('Erro ao enviar notificação:', error);
      }
    },
    []
  );

  // Monitorar tarefas que ficaram atrasadas
  const checkOverdueTasks = useCallback(
    (tasks: Task[]) => {
      if (typeof window === 'undefined') return;
      try {
        if (!user || !('Notification' in window) || typeof window.Notification === 'undefined' || window.Notification.permission !== 'granted') {
          return;
        }
      } catch {
        return;
      }

      // Função helper para obter horário no timezone de Campo Grande
      const getCampoGrandeTime = (date: Date = new Date()): string => {
        const cgDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Campo_Grande' }));
        return `${String(cgDate.getHours()).padStart(2, '0')}:${String(cgDate.getMinutes()).padStart(2, '0')}`;
      };
      
      const now = new Date();
      const currentTime = getCampoGrandeTime(now);

      // Primeira execução: apenas preencher estado anterior, sem notificar (evita spam ao abrir a página)
      if (!hasInitializedOverdueCheckRef.current) {
        tasks.forEach((task) => {
          if (task.status === 'completed') {
            previousTasksRef.current.set(task.id, false);
            return;
          }
          let currentIsOverdue = false;
          if (task.deadline) {
            try {
              const deadlineDate = new Date(task.deadline);
              deadlineDate.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (deadlineDate.getTime() === today.getTime() && task.timeLimit) {
                currentIsOverdue = task.timeLimit <= currentTime;
              } else if (deadlineDate < today) {
                currentIsOverdue = true;
              }
            } catch {
              // ignore
            }
          } else if (task.isRecurring && task.recurringDayOfMonth != null && task.recurringDayOfMonth >= 1 && task.recurringDayOfMonth <= 31) {
            const cgNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Campo_Grande' }));
            const todayDay = cgNow.getDate();
            if (todayDay === task.recurringDayOfMonth && task.timeLimit) {
              currentIsOverdue = task.timeLimit <= currentTime;
            }
          } else if (task.isRecurring && task.timeLimit) {
            currentIsOverdue = task.timeLimit <= currentTime;
          } else if (task.isOverdue) {
            currentIsOverdue = true;
          }
          previousTasksRef.current.set(task.id, Boolean(currentIsOverdue));
        });
        hasInitializedOverdueCheckRef.current = true;
        return;
      }

      tasks.forEach((task) => {
        // Ignorar tarefas concluídas
        if (task.status === 'completed') {
          previousTasksRef.current.set(task.id, false);
          return;
        }

        const previousIsOverdue = previousTasksRef.current.get(task.id) ?? false;
        
        // Verificar se está atrasada: considerar flag do backend, mas validar tarefas mensais
        let currentIsOverdue = false;
        
        // PRIORIDADE 1: Se tem deadline, tratar como tarefa única
        if (task.deadline) {
          try {
            const deadlineDate = new Date(task.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            const cgToday = new Date(now.toLocaleString('en-US', { timeZone: 'America/Campo_Grande' }));
            const today = new Date(cgToday);
            today.setHours(0, 0, 0, 0);
            
            if (deadlineDate.getTime() === today.getTime()) {
              // Se o deadline é hoje, verificar se o horário já passou
              if (task.timeLimit) {
                currentIsOverdue = task.timeLimit <= currentTime;
              }
            } else if (deadlineDate < today) {
              // Se o deadline já passou, está atrasada
              currentIsOverdue = true;
            }
          } catch (err) {
            console.error('Erro ao processar deadline da tarefa:', task.id, err);
          }
        }
        // PRIORIDADE 2: Para tarefas recorrentes mensais (com recurringDayOfMonth válido)
        else if (task.isRecurring && 
                 task.recurringDayOfMonth !== null && 
                 task.recurringDayOfMonth !== undefined && 
                 task.recurringDayOfMonth >= 1 && 
                 task.recurringDayOfMonth <= 31) {
          const cgToday = new Date(now.toLocaleString('en-US', { timeZone: 'America/Campo_Grande' }));
          const todayDay = cgToday.getDate();
          // Só considerar atrasada se hoje for o dia do mês especificado E o horário já passou
          if (todayDay === task.recurringDayOfMonth && task.timeLimit) {
            currentIsOverdue = task.timeLimit <= currentTime;
          }
          // Se não é o dia do mês, não está atrasada (mesmo que backend tenha marcado)
        }
        // PRIORIDADE 3: Para tarefas recorrentes semanais (sem recurringDayOfMonth)
        else if (task.isRecurring && task.timeLimit) {
          currentIsOverdue = task.timeLimit <= currentTime;
        }
        // PRIORIDADE 4: Se o backend marcou como atrasada e não é tarefa mensal, respeitar
        else if (task.isOverdue) {
          currentIsOverdue = true;
        }

        // Só notificar quando a tarefa ACABOU DE FICAR atrasada (transição false → true)
        if (!previousIsOverdue && currentIsOverdue) {
          const shouldNotify = 
            (task.assignedToId === user.id) ||
            (isManager);

          if (shouldNotify) {
            const taskName = task.name.length > 50 ? `${task.name.substring(0, 50)}...` : task.name;
            const reason = task.timeLimit 
              ? `Horário limite ultrapassado (${task.timeLimit})`
              : 'Tarefa pendente do dia anterior';

            sendNotification('Tarefa Atrasada', {
              body: `${taskName}\n${reason}`,
              tag: `task-overdue-${task.id}`,
            });
          }
        }

        previousTasksRef.current.set(task.id, Boolean(currentIsOverdue));
      });
    },
    [user, isManager, sendNotification]
  );

  // Monitorar novos alertas de overdue
  const checkOverdueAlerts = useCallback(
    (alerts: OverdueAlert[]) => {
      if (typeof window === 'undefined') return;
      try {
        if (!user || !('Notification' in window) || typeof window.Notification === 'undefined' || window.Notification.permission !== 'granted') {
          return;
        }
      } catch {
        return;
      }

      alerts.forEach((alert) => {
        // Se é um novo alerta que ainda não foi notificado
        if (!previousAlertsRef.current.has(alert.id) && alert.status === 'active') {
          // Administradores veem todos os alertas
          // Funcionários veem apenas os seus
          const shouldNotify = isManager || alert.userId === user.id;

          if (shouldNotify) {
            const taskName = alert.task.name.length > 50 
              ? `${alert.task.name.substring(0, 50)}...` 
              : alert.task.name;
            
            const assignedTo = alert.task.assignedTo 
              ? `Responsável: ${alert.task.assignedTo.name}`
              : 'Sem responsável atribuído';

            sendNotification('Nova Tarefa Atrasada', {
              body: `${taskName}\n${assignedTo}`,
              tag: `alert-${alert.id}`, // Evita duplicatas
            });
          }

          // Marcar como notificado
          previousAlertsRef.current.add(alert.id);
        }
      });

      // Limpar alertas que não estão mais ativos
      const activeAlertIds = new Set(alerts.map(a => a.id));
      previousAlertsRef.current.forEach((alertId) => {
        if (!activeAlertIds.has(alertId)) {
          previousAlertsRef.current.delete(alertId);
        }
      });
    },
    [user, isManager, sendNotification]
  );

  const previousRequestsCountRef = useRef<number>(0);

  // Monitorar novas solicitações de acesso (apenas para admins)
  const checkPendingRequests = useCallback(
    async () => {
      if (typeof window === 'undefined') return;
      try {
        if (!user || !isManager || !('Notification' in window) || typeof window.Notification === 'undefined' || window.Notification.permission !== 'granted') {
          return;
        }
      } catch {
        return;
      }

      try {
        const requests = await authApi.getPendingRequests();
        
        // Se há novas solicitações, notificar
        if (requests.length > previousRequestsCountRef.current) {
          const newCount = requests.length - previousRequestsCountRef.current;
          const message = newCount === 1 
            ? '1 nova solicitação de acesso aguardando aprovação'
            : `${newCount} novas solicitações de acesso aguardando aprovação`;
          
          sendNotification('Nova Solicitação de Acesso', {
            body: message,
            tag: 'new-authorization-request',
          });
        }
        
        previousRequestsCountRef.current = requests.length;
      } catch (error) {
        console.error('Erro ao verificar solicitações pendentes:', error);
      }
    },
    [user, isManager, sendNotification]
  );

  return {
    requestPermission,
    checkOverdueTasks,
    checkOverdueAlerts,
    checkPendingRequests,
    sendNotification,
    isSupported,
    permission,
  };
}
