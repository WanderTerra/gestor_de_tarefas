import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Função para testar a conexão com o banco
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error: any) {
    const errorMsg = error?.message || 'Erro desconhecido';
    if (errorMsg.includes("Can't reach database server")) {
      console.error('❌ Não foi possível conectar ao banco de dados.');
      console.error('   Verifique se:');
      console.error('   1. O túnel SSH está ativo (se SSH_HOST estiver configurado)');
      console.error('   2. O banco de dados está rodando');
      console.error('   3. As credenciais no DATABASE_URL estão corretas');
    }
    return false;
  }
}
