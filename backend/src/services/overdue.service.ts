import { prisma } from '../config/prisma.js';
import { auditService } from './audit.service.js';
import { isManagerRole } from '../middleware/auth.js';

const ACTIVE_STATUSES = ['pending', 'in-progress', 'waiting', 'not-executed'];
const SYSTEM_USER_ID = 1; // ID do sistema para auditoria automática

export const overdueService = {
  /**
   * Verifica tarefas ativas que ficaram pendentes do dia anterior
   * e cria alertas na tabela overdue_alerts (sem duplicar).
   */
  async checkAndCreateAlerts(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar tarefas ativas que foram atualizadas antes de hoje
      const overdueTasks = await prisma.task.findMany({
        where: {
          status: { in: ACTIVE_STATUSES },
          updatedAt: { lt: today },
        },
        select: { id: true, assignedToId: true, updatedAt: true },
      });

      if (overdueTasks.length === 0) {
        console.log('✅ Nenhuma tarefa atrasada detectada.');
        return 0;
      }

      // Criar alertas para cada tarefa (ignora duplicatas pela constraint unique)
      let created = 0;
      for (const task of overdueTasks) {
        try {
          await prisma.overdueAlert.upsert({
            where: {
              taskId_referenceDate: {
                taskId: task.id,
                referenceDate: today,
              },
            },
            update: {},  // Não atualiza se já existe
            create: {
              taskId: task.id,
              userId: task.assignedToId,
              referenceDate: today,
              status: 'active',
            },
          });
          created++;
        } catch {
          // Ignora erros de constraint (alerta já existe)
        }
      }

      // Também marca isOverdue na tarefa (campo auxiliar para consultas rápidas)
      await prisma.task.updateMany({
        where: {
          id: { in: overdueTasks.map((t) => t.id) },
          isOverdue: false,
        },
        data: { isOverdue: true },
      });

      // Registrar na auditoria cada tarefa marcada como atrasada (pendência do dia anterior)
      for (const task of overdueTasks) {
        try {
          await auditService.log({
            userId: task.assignedToId ?? SYSTEM_USER_ID,
            action: 'overdue_previous_day',
            entity: 'task',
            entityId: task.id,
            details: JSON.stringify({
              reason: 'Tarefa pendente do dia anterior',
              assignedToId: task.assignedToId,
              detectedAt: today.toISOString(),
            }),
          }).catch((err) => {
            console.error('⚠️ Erro ao registrar auditoria para tarefa atrasada:', err);
          });
        } catch (err) {
          console.error(`⚠️ Erro ao processar tarefa ${task.id} na auditoria:`, err);
        }
      }

      console.log(`📌 ${created} alerta(s) de atraso criado(s) para hoje.`);
      return created;
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro desconhecido';
      if (errorMsg.includes('Can\'t reach database') || errorMsg.includes('database server')) {
        console.warn('⚠️ Banco de dados não acessível na verificação de pendências. Túnel SSH pode estar inativo.');
        return 0; // Retorna 0 sem quebrar o servidor
      }
      console.error('❌ Erro na verificação de pendências do dia anterior:', errorMsg);
      return 0; // Retorna 0 para não quebrar o servidor
    }
  },

  /**
   * Verifica tarefas ativas com timeLimit (horário limite) que já foi
   * ultrapassado no dia de hoje e marca isOverdue = true.
   * Roda a cada minuto para capturar o atraso assim que ocorrer.
   * 
   * Para tarefas únicas (com deadline): só marca como atrasada se a data atual >= deadline
   * Para tarefas recorrentes: marca se o horário atual >= timeLimit
   */
  async checkTimeLimitOverdue(): Promise<number> {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar tarefas ativas que têm timeLimit definido,
      // cujo horário já foi ultrapassado e ainda não estão marcadas como atrasadas
      const tasksWithTimeLimit = await prisma.task.findMany({
        where: {
          status: { in: ACTIVE_STATUSES },
          timeLimit: { not: null },
          isOverdue: false,
        },
        select: { id: true, timeLimit: true, deadline: true, isRecurring: true, recurringDayOfMonth: true, recurringDays: true },
      });

      const overdue = tasksWithTimeLimit.filter((t) => {
        if (!t.timeLimit) return false;
        
        // Para tarefas únicas (com deadline), verificar se a data atual >= deadline
        if (!t.isRecurring && t.deadline) {
          const deadlineDate = new Date(t.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          
          // Se o deadline é no futuro, não está atrasada
          if (deadlineDate > today) return false;
          
          // Se o deadline é hoje, verificar se o horário já passou
          if (deadlineDate.getTime() === today.getTime()) {
            return t.timeLimit <= currentTime;
          }
          
          // Se o deadline já passou (dia anterior), está atrasada
          return true;
        }
        
        // Para tarefas recorrentes mensais (com recurringDayOfMonth)
        if (t.isRecurring && t.recurringDayOfMonth !== null) {
          const todayDay = today.getDate();
          // Só considerar atrasada se hoje for o dia do mês especificado E o horário já passou
          if (todayDay === t.recurringDayOfMonth) {
            return t.timeLimit <= currentTime;
          }
          // Se não é o dia do mês, não está atrasada
          return false;
        }
        
        // Para tarefas recorrentes semanais (sem recurringDayOfMonth), verificar se hoje é um dos dias configurados E o horário já passou
        if (t.isRecurring) {
          // Verificar se hoje é um dos dias da semana configurados
          const todayDayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
          const dayMap: Record<number, string> = {
            0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab',
          };
          const todayDayName = dayMap[todayDayOfWeek];
          
          // Se tem dias da semana configurados, verificar se hoje é um deles
          if (t.recurringDays) {
            const recurringDaysArray = t.recurringDays.split(',').map(d => d.trim());
            if (!recurringDaysArray.includes(todayDayName)) {
              return false; // Hoje não é um dia de recorrência
            }
          }
          
          // Se hoje é um dia de recorrência, verificar se o horário já passou
          return t.timeLimit <= currentTime;
        }
        
        return false;
      });

      if (overdue.length === 0) return 0;

      await prisma.task.updateMany({
        where: {
          id: { in: overdue.map((t) => t.id) },
        },
        data: { isOverdue: true },
      });

      // Registrar na auditoria cada tarefa que ultrapassou o horário limite
      for (const task of overdue) {
        try {
          // Buscar o responsável pela tarefa
          const fullTask = await prisma.task.findUnique({
            where: { id: task.id },
            select: { assignedToId: true, name: true },
          });
          await auditService.log({
            userId: fullTask?.assignedToId ?? SYSTEM_USER_ID,
            action: 'overdue_time_limit',
            entity: 'task',
            entityId: task.id,
            details: JSON.stringify({
              reason: `Horário limite ultrapassado (${task.timeLimit})`,
              timeLimit: task.timeLimit,
              detectedAt: currentTime,
              taskName: fullTask?.name,
            }),
          }).catch((err) => {
            console.error('⚠️ Erro ao registrar auditoria para tarefa atrasada:', err);
          });
        } catch (err) {
          console.error(`⚠️ Erro ao processar tarefa ${task.id} na verificação de horário limite:`, err);
        }
      }

      console.log(`⏰ ${overdue.length} tarefa(s) marcada(s) como atrasada(s) por horário limite (${currentTime}).`);
      return overdue.length;
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro desconhecido';
      if (errorMsg.includes('Can\'t reach database') || errorMsg.includes('database server')) {
        console.warn('⚠️ Banco de dados não acessível na verificação de horário limite. Túnel SSH pode estar inativo.');
        return 0; // Retorna 0 sem quebrar o servidor
      }
      console.error('❌ Erro na verificação de horário limite:', errorMsg);
      return 0; // Retorna 0 para não quebrar o servidor
    }
  },

  /**
   * Resolver alertas quando a tarefa é finalizada
   */
  async resolveByTask(taskId: number): Promise<void> {
    await prisma.overdueAlert.updateMany({
      where: {
        taskId,
        status: { in: ['active', 'acknowledged'] },
      },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });

    // Limpa flag na tarefa
    await prisma.task.update({
      where: { id: taskId },
      data: { isOverdue: false },
    });
  },

  /**
   * Limpa flag isOverdue de tarefas únicas que têm deadline no futuro
   * OU deadline hoje mas horário ainda não passou
   * (corrige tarefas que foram marcadas incorretamente)
   * 
   * IMPORTANTE: Compara apenas a DATA do deadline, ignorando a hora
   */
  async clearFutureDeadlineOverdue(): Promise<number> {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar tarefas únicas com deadline e isOverdue = true
      const tasksToCheck = await prisma.task.findMany({
        where: {
          isRecurring: false,
          deadline: { not: null },
          isOverdue: true,
          status: { in: ACTIVE_STATUSES },
        },
        select: { id: true, deadline: true, timeLimit: true },
      });

      // Filtrar apenas as que têm deadline no futuro OU deadline hoje mas horário ainda não passou
      const tasksToClear = tasksToCheck.filter((task) => {
        if (!task.deadline) return false;
        const deadlineDate = new Date(task.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        
        // Se o deadline é no futuro, limpar
        if (deadlineDate > today) {
          return true;
        }
        
        // Se o deadline é hoje, verificar se o horário ainda não passou
        if (deadlineDate.getTime() === today.getTime()) {
          if (task.timeLimit && task.timeLimit > currentTime) {
            return true; // Horário ainda não passou, limpar
          }
        }
        
        return false;
      });

      if (tasksToClear.length === 0) {
        return 0;
      }

      const result = await prisma.task.updateMany({
        where: {
          id: { in: tasksToClear.map((t) => t.id) },
        },
        data: {
          isOverdue: false,
        },
      });

      if (result.count > 0) {
        console.log(`✅ ${result.count} tarefa(s) com deadline futuro ou horário não ultrapassado tiveram flag isOverdue limpa.`);
      }

      return result.count;
    } catch (err: any) {
      console.error('❌ Erro ao limpar flag isOverdue de tarefas com deadline futuro:', err);
      return 0;
    }
  },

  /**
   * Limpa flag isOverdue de tarefas recorrentes mensais que não estão no dia correto
   * (corrige tarefas que foram marcadas incorretamente antes da correção)
   */
  async clearMonthlyRecurringOverdue(): Promise<number> {
    try {
      const today = new Date();
      const todayDay = today.getDate();
      const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      // Buscar tarefas recorrentes mensais com isOverdue = true
      const tasksToCheck = await prisma.task.findMany({
        where: {
          isRecurring: true,
          recurringDayOfMonth: { not: null },
          isOverdue: true,
          status: { in: ACTIVE_STATUSES },
        },
        select: { id: true, recurringDayOfMonth: true, timeLimit: true },
      });

      // Filtrar apenas as que não estão no dia correto OU horário ainda não passou
      const tasksToClear = tasksToCheck.filter((task) => {
        if (task.recurringDayOfMonth === null) return false;
        
        // Se não é o dia do mês especificado, limpar
        if (todayDay !== task.recurringDayOfMonth) {
          return true;
        }
        
        // Se é o dia correto mas o horário ainda não passou, limpar
        if (task.timeLimit && task.timeLimit > currentTime) {
          return true;
        }
        
        return false;
      });

      if (tasksToClear.length === 0) {
        return 0;
      }

      const result = await prisma.task.updateMany({
        where: {
          id: { in: tasksToClear.map((t) => t.id) },
        },
        data: {
          isOverdue: false,
        },
      });

      if (result.count > 0) {
        console.log(`✅ ${result.count} tarefa(s) recorrente(s) mensal(is) tiveram flag isOverdue limpa (não está no dia correto ou horário ainda não passou).`);
      }

      return result.count;
    } catch (err: any) {
      console.error('❌ Erro ao limpar flag isOverdue de tarefas recorrentes mensais:', err);
      return 0;
    }
  },

  /**
   * Buscar alertas ativos para exibir no banner
   * - Gestor vê todos
   * - Funcionário vê só os dele
   */
  async getActiveAlerts(userId: number, role: string) {
    const where: any = {
      status: 'active',
    };

    if (!isManagerRole(role)) {
      where.userId = userId;
    }

    const alerts = await prisma.overdueAlert.findMany({
      where,
      include: {
        task: {
          include: {
            assignedTo: {
              select: { id: true, username: true, name: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { detectedAt: 'desc' },
    });

    return alerts;
  },

  /**
   * Dispensar (acknowledge) um alerta — o usuário viu e fechou o banner
   */
  async acknowledge(alertId: number): Promise<void> {
    await prisma.overdueAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
      },
    });
  },

  /**
   * Dispensar todos os alertas ativos de um usuário
   */
  async acknowledgeAll(userId: number, role: string): Promise<void> {
    const where: any = {
      status: 'active',
    };

    if (!isManagerRole(role)) {
      where.userId = userId;
    }

    await prisma.overdueAlert.updateMany({
      where,
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
      },
    });
  },

  /**
   * Histórico de alertas (para auditoria/relatórios futuros)
   */
  async getHistory(params: { userId?: number; limit?: number; offset?: number }) {
    const where: any = {};
    if (params.userId) where.userId = params.userId;

    const [alerts, total] = await Promise.all([
      prisma.overdueAlert.findMany({
        where,
        include: {
          task: { select: { id: true, name: true, status: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { detectedAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      prisma.overdueAlert.count({ where }),
    ]);

    return { alerts, total };
  },

  /**
   * Verifica se hoje é um dia de recorrência válido para a tarefa
   */
  isTodayRecurringDay(task: { recurringDays: string | null; recurringDayOfMonth: number | null }): boolean {
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
    const todayDayOfMonth = today.getDate();

    // Mapear dia da semana numérico para string
    const dayMap: Record<number, string> = {
      0: 'dom', // Domingo
      1: 'seg', // Segunda
      2: 'ter', // Terça
      3: 'qua', // Quarta
      4: 'qui', // Quinta
      5: 'sex', // Sexta
      6: 'sab', // Sábado
    };
    const todayDayName = dayMap[todayDayOfWeek];

    // PRIORIDADE 1: Se tem recurringDays configurado, usar apenas os dias da semana
    // O recurringDayOfMonth é apenas uma referência do primeiro dia, não uma restrição
    if (task.recurringDays) {
      const recurringDaysArray = task.recurringDays.split(',').map(d => d.trim());
      return recurringDaysArray.includes(todayDayName);
    }

    // PRIORIDADE 2: Se não tem recurringDays mas tem recurringDayOfMonth, usar o dia do mês
    if (task.recurringDayOfMonth !== null && task.recurringDayOfMonth !== undefined) {
      return todayDayOfMonth === task.recurringDayOfMonth;
    }

    return false;
  },

  /**
   * Limpa flag isOverdue de tarefas recorrentes semanais que foram marcadas incorretamente
   * (não estão no dia correto da semana ou o horário ainda não passou)
   */
  async clearIncorrectWeeklyRecurringOverdue(): Promise<number> {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar tarefas recorrentes semanais que estão marcadas como atrasadas
      const weeklyRecurringTasks = await prisma.task.findMany({
        where: {
          isRecurring: true,
          recurringDayOfMonth: null, // Apenas tarefas semanais (sem dia do mês)
          isOverdue: true,
          status: { in: ACTIVE_STATUSES },
        },
        select: {
          id: true,
          timeLimit: true,
          recurringDays: true,
        },
      });

      const dayMap: Record<number, string> = {
        0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab',
      };
      const todayDayOfWeek = now.getDay();
      const todayDayName = dayMap[todayDayOfWeek];

      let clearedCount = 0;

      for (const task of weeklyRecurringTasks) {
        let shouldClear = false;

        // Verificar se tem dias da semana configurados
        if (task.recurringDays) {
          const recurringDaysArray = task.recurringDays.split(',');
          
          // Se hoje não é um dos dias de recorrência, limpar flag
          if (!recurringDaysArray.includes(todayDayName)) {
            shouldClear = true;
          } else if (task.timeLimit) {
            // Se hoje é um dia de recorrência, verificar se o horário já passou
            // Se o horário ainda não passou, limpar flag
            if (task.timeLimit > currentTime) {
              shouldClear = true;
            }
          }
        } else {
          // Se não tem dias configurados, verificar apenas o horário
          if (task.timeLimit && task.timeLimit > currentTime) {
            shouldClear = true;
          }
        }

        if (shouldClear) {
          await prisma.task.update({
            where: { id: task.id },
            data: { isOverdue: false },
          });
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        console.log(`🧹 ${clearedCount} tarefa(s) recorrente(s) semanal(is) tiveram flag isOverdue limpa (marcação incorreta).`);
      }

      return clearedCount;
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro desconhecido';
      if (errorMsg.includes('Can\'t reach database') || errorMsg.includes('database server')) {
        console.warn('⚠️ Banco de dados não acessível ao limpar flags incorretas. Túnel SSH pode estar inativo.');
        return 0;
      }
      console.error('❌ Erro ao limpar flags incorretas de tarefas recorrentes semanais:', errorMsg);
      return 0;
    }
  },

  /**
   * Reseta tarefas recorrentes concluídas para "pending" apenas se hoje for um dia de recorrência válido
   * e a tarefa não foi completada hoje (verifica tabela task_completions)
   */
  async resetCompletedRecurringTasks(): Promise<number> {
    try {
      // Buscar todas as tarefas recorrentes concluídas
      const completedRecurringTasks = await prisma.task.findMany({
        where: {
          isRecurring: true,
          status: 'completed',
        },
        select: {
          id: true,
          recurringDays: true,
          recurringDayOfMonth: true,
        },
      });

      if (completedRecurringTasks.length === 0) {
        return 0;
      }

      let resetCount = 0;
      const now = new Date();
      // Criar data de hoje em UTC (meia-noite UTC) para evitar problemas de timezone
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      for (const task of completedRecurringTasks) {
        // Verificar se hoje é um dia de recorrência válido para esta tarefa
        if (!this.isTodayRecurringDay(task)) {
          continue; // Se hoje não é dia de recorrência, não resetar
        }

        // Verificar se a tarefa foi completada hoje usando a tabela de histórico
        // completedDate é DateTime normalizado para meia-noite, então comparamos diretamente
        const completionToday = await prisma.taskCompletion.findFirst({
          where: {
            taskId: task.id,
            completedDate: {
              gte: today, // maior ou igual a meia-noite de hoje
              lt: tomorrow, // menor que meia-noite de amanhã
            },
          },
        });

        // Se foi completada hoje, não resetar (deve permanecer concluída até amanhã)
        if (completionToday) {
          continue;
        }

        // Se hoje é dia de recorrência E não foi completada hoje, resetar para pending
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'pending',
            reason: null, // Limpar motivo ao resetar
          },
        });
        resetCount++;
      }

      if (resetCount > 0) {
        console.log(`🔄 ${resetCount} tarefa(s) recorrente(s) resetada(s) de "completed" para "pending" (hoje é dia de recorrência).`);
      } else if (completedRecurringTasks.length > 0) {
        console.log(`ℹ️ ${completedRecurringTasks.length} tarefa(s) recorrente(s) concluída(s) encontrada(s), mas nenhuma foi resetada (não é dia de recorrência ou foi completada hoje).`);
      }

      return resetCount;
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro desconhecido';
      if (errorMsg.includes('Can\'t reach database') || errorMsg.includes('database server')) {
        console.warn('⚠️ Banco de dados não acessível ao resetar tarefas recorrentes. Túnel SSH pode estar inativo.');
        return 0;
      }
      console.error('❌ Erro ao resetar tarefas recorrentes concluídas:', errorMsg);
      return 0;
    }
  },
};
