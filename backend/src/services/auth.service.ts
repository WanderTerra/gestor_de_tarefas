import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { LoginInput } from '../schemas/auth.schema.js';

export const authService = {
  async login(data: LoginInput) {
    try {
      const user = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (!user || !user.active) {
        throw new AppError(401, 'Usuário ou senha inválidos');
      }

      const passwordMatch = await bcrypt.compare(data.password, user.password);
      if (!passwordMatch) {
        throw new AppError(401, 'Usuário ou senha inválidos');
      }

      if (!env.JWT_SECRET) {
        throw new AppError(500, 'JWT_SECRET não configurado');
      }

      const token = jwt.sign(
        { userId: user.id },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN },
      );

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      };
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      const errorMsg = err?.message || 'Erro desconhecido';
      if (errorMsg.includes('Can\'t reach database') || errorMsg.includes('database server')) {
        console.error('❌ Erro de conexão com o banco de dados no login:', errorMsg);
        throw new AppError(503, 'Serviço temporariamente indisponível. Verifique a conexão com o banco de dados.');
      }
      console.error('❌ Erro no authService.login:', errorMsg);
      throw new AppError(500, 'Erro ao processar login');
    }
  },
};
