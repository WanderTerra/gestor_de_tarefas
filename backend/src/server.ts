import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import { createSSHTunnel, closeSSHTunnel } from './config/ssh-tunnel.js';
import { overdueService } from './services/overdue.service.js';

const app = express();

// Middleware de segurança
app.use(helmet());

// CORS
// Em desenvolvimento, aceita qualquer origem (incluindo IPs da rede)
// Em produção, usa apenas as origens configuradas (seguro)
// IMPORTANTE: Por padrão, assume produção (mais seguro). 
// Só aceita qualquer origem se NODE_ENV for explicitamente 'development'
const isDevelopment = env.NODE_ENV === 'development';
const corsOptions = isDevelopment
  ? {
      origin: true, // Aceita qualquer origem em dev
      credentials: true,
    }
  : {
      origin: env.CORS_ORIGIN, // Em produção: apenas origens configuradas
      credentials: true,
    };

app.use(cors(corsOptions));

// Parse JSON
app.use(express.json());

// Middleware de log para debug (apenas em desenvolvimento)
if (env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`📥 ${req.method} ${req.path} - Query:`, req.query, 'Body:', req.body);
    next();
  });
}

// Rotas da API
app.use('/api', routes);

// Log para debug em desenvolvimento
if (env.NODE_ENV === 'development') {
  console.log('✅ Rotas da API registradas em /api');
  // Listar todas as rotas registradas
  app._router?.stack?.forEach((middleware: any) => {
    if (middleware.route) {
      console.log(`  ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      console.log(`  Router: ${middleware.regexp}`);
    }
  });
}

// Tratamento global de erros
app.use(errorHandler);

// Iniciar servidor (com túnel SSH se configurado)
async function start() {
  // Tenta abrir túnel SSH, mas não bloqueia o servidor se falhar
  if (env.SSH_HOST) {
    try {
      await createSSHTunnel();
      // Aguardar um pouco para o túnel estabilizar
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.warn('⚠️  Aviso: Não foi possível estabelecer túnel SSH. Continuando sem túnel...');
      console.warn('   Se você precisa do túnel SSH, verifique as credenciais e conectividade.');
      // Não rejeita - permite que o servidor inicie mesmo sem túnel
    }
  } else {
    console.log('ℹ️  SSH_HOST não configurado. Conectando diretamente ao banco local.');
  }

  try {
    app.listen(env.PORT, () => {
      console.log(`🚀 Backend rodando em http://localhost:${env.PORT}`);
      console.log(`📋 API: http://localhost:${env.PORT}/api`);
      console.log(`🏥 Health: http://localhost:${env.PORT}/api/health`);
      console.log(`🌍 Ambiente: ${env.NODE_ENV}`);

      // Inicialização assíncrona em background (não bloqueia o servidor)
      (async () => {
        try {
          const { testDatabaseConnection } = await import('./config/prisma.js');
          const dbConnected = await testDatabaseConnection();
          if (!dbConnected) {
            console.error('❌ ATENÇÃO: Banco de dados não está acessível!');
            console.error('   Ajuste DATABASE_URL no arquivo backend/.env e tenha MySQL/MariaDB rodando.');
            console.error('   Crie o banco: CREATE DATABASE gestor_tarefas;');
            console.error('   Depois: cd backend && npm run db:migrate && npm run db:seed');
          } else {
            console.log('✅ Conexão com banco de dados estabelecida com sucesso.');
            try {
              await overdueService.checkAndCreateAlerts();
              await overdueService.checkTimeLimitOverdue();
              // Limpar flag isOverdue de tarefas com deadline no futuro (corrige marcações incorretas)
              await overdueService.clearFutureDeadlineOverdue();
              // Limpar flag isOverdue de tarefas recorrentes mensais que não estão no dia correto
              await overdueService.clearMonthlyRecurringOverdue();
            } catch (err) {
              console.error('⚠️ Erro ao verificar tarefas atrasadas:', err);
            }
            setInterval(async () => {
              try {
                await overdueService.checkAndCreateAlerts();
              } catch (err) {
                console.error('⚠️ Erro na verificação periódica de overdue:', err);
              }
            }, 60 * 60 * 1000);
            setInterval(async () => {
              try {
                await overdueService.checkTimeLimitOverdue();
                // Limpar flag isOverdue de tarefas com deadline no futuro (corrige marcações incorretas)
                await overdueService.clearFutureDeadlineOverdue();
                // Limpar flag isOverdue de tarefas recorrentes mensais que não estão no dia correto
                await overdueService.clearMonthlyRecurringOverdue();
              } catch (err) {
                console.error('⚠️ Erro na verificação de horário limite:', err);
              }
            }, 60 * 1000);
          }
        } catch (err) {
          console.error('⚠️ Erro na inicialização:', err);
        }
      })();
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Encerrar túnel SSH ao fechar o processo
process.on('SIGINT', async () => {
  await closeSSHTunnel();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeSSHTunnel();
  process.exit(0);
});

start();

export default app;
