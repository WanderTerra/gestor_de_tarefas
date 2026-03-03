import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || ['http://localhost:5173'],
  JWT_SECRET: process.env.JWT_SECRET || 'gestor-tarefas-secret-dev-2024',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  // SSH Tunnel (para conectar ao banco na VPS)
  SSH_HOST: process.env.SSH_HOST || '',
  SSH_PORT: Number(process.env.SSH_PORT) || 22,
  SSH_USER: process.env.SSH_USER || '',
  SSH_PASSWORD: process.env.SSH_PASSWORD || '',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 3306,
} as const;
