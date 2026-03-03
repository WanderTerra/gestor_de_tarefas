import { Client } from 'ssh2';
import net from 'net';
import { env } from './env.js';

let tunnelServer: net.Server | null = null;
let sshClient: Client | null = null;
let isReconnecting = false; // Flag para evitar múltiplas reconexões simultâneas

export async function createSSHTunnel(): Promise<void> {
  // Só cria túnel se SSH_HOST estiver configurado
  if (!env.SSH_HOST) {
    console.log('⏭️  SSH_HOST não configurado, conectando direto ao banco local.');
    return;
  }

  // Verifica se a porta local já está em uso (túnel já ativo)
  const portInUse = await isPortInUse(env.DB_PORT);
  if (portInUse) {
    console.log(`⚠️  Porta ${env.DB_PORT} já em uso. Verificando se o túnel está funcionando...`);
    
    // Aguardar um pouco antes de testar (pode estar inicializando)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Testar se o túnel está realmente funcionando (teste de conexão TCP simples)
    const isWorking = await verifyTunnelConnection();
    if (isWorking) {
      console.log('✅ Túnel SSH já está ativo e funcionando.');
      return;
    }
    
    // Se a porta está em uso mas o túnel não funciona, limpar e recriar
    console.warn('⚠️  Porta em uso mas túnel não está funcionando. Limpando e recriando...');
    await closeSSHTunnel();
    // Aguardar um pouco para a porta ser liberada
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar novamente se a porta foi liberada
    const stillInUse = await isPortInUse(env.DB_PORT);
    if (stillInUse) {
      console.error(`❌ Porta ${env.DB_PORT} ainda está em uso após limpeza. Pode ser outro processo.`);
      console.error('   Tente fechar manualmente o processo que está usando a porta.');
      throw new Error(`Porta ${env.DB_PORT} está em uso por outro processo`);
    }
  }

  return new Promise((resolve, reject) => {
    sshClient = new Client();

    sshClient.on('ready', () => {
      const client = sshClient!;
      console.log('🔑 Conexão SSH estabelecida.');

      // Criar servidor TCP local que encaminha para o banco via SSH
      tunnelServer = net.createServer((localSocket) => {
        if (!sshClient) {
          localSocket.end();
          return;
        }
        
        sshClient.forwardOut(
          '127.0.0.1',
          0,
          env.DB_HOST,
          env.DB_PORT,
          (err, stream) => {
            if (err) {
              console.error('❌ Erro no túnel SSH:', err.message);
              localSocket.end();
              return;
            }
            localSocket.pipe(stream).pipe(localSocket);
          }
        );
      });

      tunnelServer.listen(env.DB_PORT, '127.0.0.1', async () => {
        console.log(`🔗 Túnel SSH ativo: localhost:${env.DB_PORT} → ${env.SSH_HOST}:${env.DB_PORT}`);
        
        // Aguardar um pouco e verificar se o túnel está realmente funcionando
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isWorking = await verifyTunnelConnection();
        if (!isWorking) {
          console.warn('⚠️  Túnel criado mas conexão não está funcionando. Pode levar alguns segundos para estabilizar.');
        }
        
        resolve();
      });

      tunnelServer.on('error', (err) => {
        console.error('❌ Erro no servidor do túnel:', err.message);
        // Não rejeita para não derrubar o servidor
        console.warn('⚠️  Túnel SSH com erro, mas servidor continua rodando.');
      });

      // Manter túnel vivo - reconectar se desconectar
      client.on('close', () => {
        if (isReconnecting) {
          return; // Já está tentando reconectar
        }
        
        console.warn('⚠️  Conexão SSH fechada. Tentando reconectar em 5 segundos...');
        // Limpar referências
        if (tunnelServer) {
          tunnelServer.close();
          tunnelServer = null;
        }
        sshClient = null;
        
        // Tentar reconectar após 5 segundos
        isReconnecting = true;
        setTimeout(async () => {
          try {
            await createSSHTunnel();
            isReconnecting = false;
            console.log('✅ Túnel SSH reconectado com sucesso.');
          } catch (err) {
            console.error('❌ Falha ao reconectar túnel SSH. Tentando novamente em 10 segundos...');
            isReconnecting = false;
            // Tentar novamente após 10 segundos
            setTimeout(() => {
              createSSHTunnel().catch(() => {
                console.error('❌ Falha ao reconectar túnel SSH após segunda tentativa.');
              });
            }, 10000);
          }
        }, 5000);
      });

      client.on('end', () => {
        console.warn('⚠️  Conexão SSH encerrada pelo servidor.');
      });
    });

    sshClient.on('error', (err: any) => {
      const errorMsg = err.message || 'Erro desconhecido';
      if (errorMsg.includes('timeout') || errorMsg.includes('Timed out')) {
        console.error('❌ Erro na conexão SSH: Timeout ao conectar.');
        console.error('   Verifique se o servidor SSH está acessível e as credenciais estão corretas.');
      } else {
        console.error('❌ Erro na conexão SSH:', errorMsg);
      }
      // Limpar referências em caso de erro
      sshClient = null;
      reject(err);
    });

    console.log(`🔗 Abrindo túnel SSH para ${env.SSH_USER}@${env.SSH_HOST}:${env.SSH_PORT}...`);

    sshClient.connect({
      host: env.SSH_HOST,
      port: env.SSH_PORT,
      username: env.SSH_USER,
      password: env.SSH_PASSWORD,
      readyTimeout: 30000, // 30 segundos
      keepaliveInterval: 10000, // Keepalive a cada 10 segundos para manter conexão viva
      keepaliveCountMax: 10, // Permitir mais tentativas antes de considerar desconectado
      tryKeyboard: false,
    });
  });
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

// Função para verificar se o túnel está realmente funcionando
async function verifyTunnelConnection(): Promise<boolean> {
  try {
    // Tentar uma conexão simples ao banco
    const testConnection = new Promise<boolean>((resolve) => {
      const socket = net.createConnection(env.DB_PORT, '127.0.0.1');
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 2000);
      
      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });
      
      socket.once('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
    
    return await testConnection;
  } catch {
    return false;
  }
}

export async function closeSSHTunnel(): Promise<void> {
  // Desabilitar reconexão automática
  isReconnecting = false;
  
  // Fechar servidor TCP
  if (tunnelServer) {
    return new Promise((resolve) => {
      tunnelServer!.close(() => {
        tunnelServer = null;
        // Fechar cliente SSH também
        if (sshClient) {
          sshClient.end();
          sshClient = null;
        }
        console.log('🔌 Túnel SSH encerrado.');
        resolve();
      });
    });
  }
  
  // Fechar cliente SSH se não houver servidor
  if (sshClient) {
    sshClient.end();
    sshClient = null;
    console.log('🔌 Cliente SSH encerrado.');
  }
  
  return Promise.resolve();
}
