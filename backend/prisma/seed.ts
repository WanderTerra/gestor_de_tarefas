import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Migrar usuários com role "manager" para "adm"
  const usersToMigrate = await prisma.user.findMany({
    where: { role: 'manager' },
  });

  if (usersToMigrate.length > 0) {
    const result = await prisma.user.updateMany({
      where: { role: 'manager' },
      data: { role: 'adm' },
    });
    console.log(`🔄 ${result.count} usuário(s) migrado(s) de "manager" para "adm"`);
  }

  // Migrar usuários com role "employee" para "backoffice" (padrão)
  const employeesToMigrate = await prisma.user.findMany({
    where: { role: 'employee' },
  });

  if (employeesToMigrate.length > 0) {
    const result = await prisma.user.updateMany({
      where: { role: 'employee' },
      data: { role: 'backoffice' },
    });
    console.log(`🔄 ${result.count} usuário(s) migrado(s) de "employee" para "backoffice"`);
  }

  // Atualizar usuários existentes para ter authorizationStatus 'approved'
  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { authorizationStatus: null },
        { authorizationStatus: { not: 'approved' } },
      ],
    },
  });

  if (existingUsers.length > 0) {
    const result = await prisma.user.updateMany({
      where: {
        OR: [
          { authorizationStatus: null },
          { authorizationStatus: { not: 'approved' } },
        ],
      },
      data: {
        authorizationStatus: 'approved',
        active: true,
      },
    });
    console.log(`✅ ${result.count} usuário(s) existente(s) marcado(s) como aprovado(s)`);
  }

  // Criar gestor admin (se não existir)
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Administrador',
        role: 'adm',
        authorizationStatus: 'approved',
        active: true,
      },
    });
    console.log(`✅ Gestor criado: ${admin.username} (senha: admin123)`);
  } else {
    // Garantir que o admin está aprovado
    await prisma.user.update({
      where: { username: 'admin' },
      data: {
        authorizationStatus: 'approved',
        active: true,
        role: 'adm',
      },
    });
    console.log('ℹ️  Gestor admin já existe e foi atualizado');
  }

  console.log('🌱 Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
