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
  
  // Usar estado para garantir que os valores sejam atualizados
  const [isSupported] = useState(() => 'Notification' in window);
  const [permission, setPermission] = useState<NotificationPermission>(() => 
    'Notification' in window ? Notification.permission : 'denied'
  );

  // Solicitar permissão de notificações
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Notificações não são suportadas neste navegador');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission === 'default') {
      try {
        const newPermission = await Notification.requestPermission();
        setPermission(newPermission);
        return newPermission === 'granted';
      } catch (error) {
        console.error('Erro ao solicitar permissão de notificações:', error);
        return false;
      }
    }

    return false;
  }, []);

  // Verificar permissão ao montar o componente
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Solicitar permissão automaticamente se ainda não foi solicitada
      if (Notification.permission === 'default' && user) {
        // Aguardar um pouco antes de solicitar para não ser intrusivo
        const timer = setTimeout(() => {
          requestPermission();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, requestPermission]);

  // Enviar notificação
  const sendNotification = useCallback(
    (title: string, options: NotificationOptions) => {
      if (!('Notification' in window)) {
        return;
      }

      if (Notification.permission !== 'granted') {
        console.log('Permissão de notificações não concedida');
        return;
      }

      try {
        const notification = new Notification(title, {
          ...options,
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
      if (!user || Notification.permission !== 'granted') {
        return;
      }

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      tasks.forEach((task) => {
        // Ignorar tarefas concluídas
        if (task.status === 'completed') {
          previousTasksRef.current.set(task.id, false);
          return;
        }

        const previousIsOverdue = previousTasksRef.current.get(task.id) ?? false;
        
        // Verificar se está atrasada: flag do backend OU horário limite ultrapassado
        const currentIsOverdue = task.isOverdue || 
          (task.timeLimit && task.timeLimit <= currentTime);

        // Se a tarefa acabou de ficar atrasada (mudou de false para true)
        if (!previousIsOverdue && currentIsOverdue) {
          console.log(`🔔 Tarefa ${task.id} ficou atrasada!`, {
            taskName: task.name,
            timeLimit: task.timeLimit,
            currentTime,
            isOverdue: task.isOverdue,
          });
          
          // Notificar o responsável pela tarefa OU administrador
          const shouldNotify = 
            (task.assignedToId === user.id) || // É o responsável
            (isManager); // É administrador

          console.log('Deve notificar?', shouldNotify, {
            assignedToId: task.assignedToId,
            userId: user.id,
            isManager,
          });

          if (shouldNotify) {
            const taskName = task.name.length > 50 ? `${task.name.substring(0, 50)}...` : task.name;
            const reason = task.timeLimit 
              ? `Horário limite ultrapassado (${task.timeLimit})`
              : 'Tarefa pendente do dia anterior';

            console.log('📤 Enviando notificação...', { taskName, reason });
            sendNotification('⚠️ Tarefa Atrasada', {
              body: `${taskName}\n${reason}`,
              tag: `task-overdue-${task.id}`, // Evita duplicatas
            });
          }
        }

        // Atualizar estado anterior
        previousTasksRef.current.set(task.id, currentIsOverdue);
      });
    },
    [user, isManager, sendNotification]
  );

  // Monitorar novos alertas de overdue
  const checkOverdueAlerts = useCallback(
    (alerts: OverdueAlert[]) => {
      if (!user || Notification.permission !== 'granted') {
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

            sendNotification('🔔 Nova Tarefa Atrasada', {
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
      if (!user || !isManager || Notification.permission !== 'granted') {
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
          
          sendNotification('👤 Nova Solicitação de Acesso', {
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
    isSupported,
    permission,
  };
}
