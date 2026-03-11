/**
 * Script para testar a lógica de reset de tarefas recorrentes
 * 
 * Uso:
 *   tsx scripts/test-reset-logic.ts
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';
import { overdueService } from '../src/services/overdue.service.js';

async function main() {
  console.log('🧪 Testando lógica de reset de tarefas recorrentes...\n');

  try {
    // Testar conexão com banco
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexão com banco de dados estabelecida.\n');

    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR');
    const todayDayOfWeek = today.getDay();
    const todayDayName = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][todayDayOfWeek];
    
    console.log(`📅 Hoje é: ${todayStr} (${todayDayName})\n`);

    // Buscar todas as tarefas recorrentes concluídas
    const completedRecurringTasks = await prisma.task.findMany({
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

    if (completedRecurringTasks.length === 0) {
      console.log('ℹ️  Nenhuma tarefa recorrente concluída encontrada.\n');
      await prisma.$disconnect();
      return;
    }

    console.log(`📋 Encontradas ${completedRecurringTasks.length} tarefa(s) recorrente(s) concluída(s):\n`);

    for (const task of completedRecurringTasks) {
      console.log(`\n📌 Tarefa ID ${task.id}: ${task.name}`);
      console.log(`   Recorrência: ${task.recurringDays || `Dia ${task.recurringDayOfMonth} do mês`}`);
      console.log(`   Última atualização: ${new Date(task.updatedAt).toLocaleDateString('pt-BR')}`);

      // Verificar se hoje é dia de recorrência
      const isTodayRecurring = overdueService.isTodayRecurringDay(task);
      console.log(`   Hoje é dia de recorrência? ${isTodayRecurring ? '✅ SIM' : '❌ NÃO'}`);
      
      // Debug: mostrar o que está sendo comparado
      if (task.recurringDays) {
        const recurringDaysArray = task.recurringDays.split(',').map(d => d.trim());
        console.log(`   Debug: recurringDaysArray = [${recurringDaysArray.join(', ')}]`);
        console.log(`   Debug: todayDayName = "${todayDayName}"`);
        console.log(`   Debug: includes? ${recurringDaysArray.includes(todayDayName)}`);
      }

      if (!isTodayRecurring) {
        console.log(`   ⏭️  Esta tarefa NÃO será resetada (hoje não é dia de recorrência)`);
        continue;
      }

      // Verificar se foi completada hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const completionToday = await prisma.taskCompletion.findFirst({
        where: {
          taskId: task.id,
          completedDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (completionToday) {
        const completedAt = new Date(completionToday.completedAt).toLocaleString('pt-BR');
        console.log(`   ✅ Foi completada hoje às ${completedAt}`);
        console.log(`   ⏭️  Esta tarefa NÃO será resetada (foi completada hoje)`);
      } else {
        // Verificar última conclusão
        const lastCompletion = await prisma.taskCompletion.findFirst({
          where: { taskId: task.id },
          orderBy: { completedAt: 'desc' },
        });

        if (lastCompletion) {
          const lastDate = new Date(lastCompletion.completedDate).toLocaleDateString('pt-BR');
          console.log(`   📅 Última conclusão: ${lastDate}`);
        }

        console.log(`   🔄 Esta tarefa SERÁ RESETADA para "pending"`);
      }
    }

    console.log(`\n\n🔄 Executando reset...\n`);
    const resetCount = await overdueService.resetCompletedRecurringTasks();
    
    console.log(`\n✅ Reset concluído! ${resetCount} tarefa(s) resetada(s).\n`);

    // Verificar tarefas resetadas
    if (resetCount > 0) {
      const resetTasks = await prisma.task.findMany({
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

      console.log('📋 Tarefas que foram resetadas:\n');
      resetTasks.forEach((task) => {
        console.log(`  ✅ ID ${task.id}: ${task.name} → ${task.status}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
