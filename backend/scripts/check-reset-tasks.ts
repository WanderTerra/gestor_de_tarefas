/**
 * Script para verificar se as tarefas foram resetadas
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🔍 Verificando status das tarefas 143, 144, 147, 148...\n');

  try {
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: [143, 144, 147, 148] },
      },
      select: {
        id: true,
        name: true,
        status: true,
        recurringDays: true,
        recurringDayOfMonth: true,
        updatedAt: true,
      },
    });

    console.log(`📋 Status das tarefas:\n`);

    for (const task of tasks) {
      console.log(`ID ${task.id}: ${task.name}`);
      console.log(`  Status: ${task.status}`);
      console.log(`  Recorrência: ${task.recurringDays || `Dia ${task.recurringDayOfMonth} do mês`}`);
      console.log(`  Última atualização: ${new Date(task.updatedAt).toLocaleString('pt-BR')}`);
      console.log('');
    }

    // Verificar conclusões recentes
    const completions = await prisma.taskCompletion.findMany({
      where: {
        taskId: { in: [143, 144, 147, 148] },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 10,
    });

    if (completions.length > 0) {
      console.log(`📊 Últimas conclusões (histórico preservado):\n`);
      completions.forEach((c) => {
        console.log(`  - Tarefa ID ${c.taskId}: ${new Date(c.completedAt).toLocaleString('pt-BR')}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
