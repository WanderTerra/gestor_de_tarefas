/**
 * Script para verificar como os recurringDays estão armazenados no banco
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🔍 Verificando recurringDays no banco de dados...\n');

  try {
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: [143, 144, 147, 148] },
      },
      select: {
        id: true,
        name: true,
        recurringDays: true,
        recurringDayOfMonth: true,
      },
    });

    console.log(`📋 Encontradas ${tasks.length} tarefa(s):\n`);

    for (const task of tasks) {
      console.log(`ID ${task.id}: ${task.name}`);
      console.log(`  recurringDays (tipo: ${typeof task.recurringDays}): "${task.recurringDays}"`);
      console.log(`  recurringDayOfMonth: ${task.recurringDayOfMonth}`);
      
      if (task.recurringDays) {
        const array = task.recurringDays.split(',').map(d => d.trim());
        console.log(`  Array após split: [${array.join(', ')}]`);
        console.log(`  Tamanho do array: ${array.length}`);
      }
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
