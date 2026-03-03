import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Corrigindo usuário admin...');

  // Buscar o admin
  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!admin) {
    console.log('❌ Usuário admin não encontrado');
    return;
  }

  console.log('📋 Status atual do admin:', {
    username: admin.username,
    role: admin.role,
    active: admin.active,
    authorizationStatus: admin.authorizationStatus,
  });

  // Atualizar o admin para garantir que está aprovado e ativo
  const updated = await prisma.user.update({
    where: { username: 'admin' },
    data: {
      role: 'adm',
      authorizationStatus: 'approved',
      active: true,
    },
  });

  console.log('✅ Admin atualizado:', {
    username: updated.username,
    role: updated.role,
    active: updated.active,
    authorizationStatus: updated.authorizationStatus,
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
