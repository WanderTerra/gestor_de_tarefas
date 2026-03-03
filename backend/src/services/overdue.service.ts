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
   */
  async checkTimeLimitOverdue(): Promise<number> {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Buscar tarefas ativas que têm timeLimit definido,
      // cujo horário já foi ultrapassado e ainda não estão marcadas como atrasadas
      const tasksWithTimeLimit = await prisma.task.findMany({
        where: {
          status: { in: ACTIVE_STATUSES },
          timeLimit: { not: null },
          isOverdue: false,
        },
        select: { id: true, timeLimit: true },
      });

      const overdue = tasksWithTimeLimit.filter(
        (t) => t.timeLimit && t.timeLimit <= currentTime
      );

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
};
