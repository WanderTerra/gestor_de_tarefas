/**
 * Script para resetar tarefas recorrentes concluídas
 * 
 * Uso:
 *   npm run reset:recurring
 *   ou
 *   tsx scripts/reset-recurring-tasks.ts
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';
import { overdueService } from '../src/services/overdue.service.js';

async function main() {
  console.log('🔄 Iniciando reset de tarefas recorrentes concluídas...\n');

  try {
    // Testar conexão com banco
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexão com banco de dados estabelecida.\n');

    // Listar tarefas recorrentes concluídas antes do reset
    const beforeReset = await prisma.task.findMany({
      where: {
        isRecurring: true,
        status: 'completed',
      },
      select: {
        id: true,
        name: true,
        recurringDays: true,
        recurringDayOfMonth: true,
        updatedAt: true,
      },
    });

    console.log(`📋 Encontradas ${beforeReset.length} tarefa(s) recorrente(s) concluída(s):\n`);
    beforeReset.forEach((task) => {
      console.log(`  - ID ${task.id}: ${task.name}`);
      console.log(`    Recorrência: ${task.recurringDays || `Dia ${task.recurringDayOfMonth} do mês`}`);
      console.log(`    Última atualização: ${new Date(task.updatedAt).toLocaleString('pt-BR')}\n`);
    });

    // Executar reset
    const resetCount = await overdueService.resetCompletedRecurringTasks();

    console.log(`\n✅ Reset concluído! ${resetCount} tarefa(s) resetada(s).\n`);

    // Listar tarefas que foram resetadas
    if (resetCount > 0) {
      const afterReset = await prisma.task.findMany({
        where: {
          isRecurring: true,
          status: 'pending',
          updatedAt: {
            gte: new Date(Date.now() - 60000), // Último minuto
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      console.log('📋 Tarefas resetadas para "pending":\n');
      afterReset.forEach((task) => {
        console.log(`  - ID ${task.id}: ${task.name} (${task.status})`);
      });
    }

    // Verificar histórico de conclusões
    const completions = await prisma.taskCompletion.findMany({
      where: {
        taskId: {
          in: beforeReset.map((t) => t.id),
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 10,
    });

    if (completions.length > 0) {
      console.log(`\n📊 Últimas ${completions.length} conclusões registradas (histórico preservado):\n`);
      completions.forEach((c) => {
        console.log(`  - Tarefa ID ${c.taskId}: ${new Date(c.completedAt).toLocaleString('pt-BR')}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Erro ao resetar tarefas:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
