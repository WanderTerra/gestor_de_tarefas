import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { LoginInput, RegisterInput, ApproveUserInput, RejectUserInput } from '../schemas/auth.schema.js';

export const authService = {
  async login(data: LoginInput) {
    try {
      const user = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (!user || !user.active) {
        throw new AppError(401, 'Usuário ou senha inválidos');
      }

      // Verificar se o usuário está autorizado
      if (user.authorizationStatus !== 'approved') {
        if (user.authorizationStatus === 'pending') {
          throw new AppError(403, 'Aguardando autorização do gestor');
        }
        if (user.authorizationStatus === 'rejected') {
          throw new AppError(403, 'Solicitação de acesso rejeitada');
        }
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
          authorizationStatus: user.authorizationStatus,
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

  async register(data: RegisterInput) {
    // Verificar se username já existe
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new AppError(409, 'Nome de usuário já existe');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        name: data.name,
        role: 'backoffice', // Role padrão, será definido pelo gestor na aprovação
        authorizationStatus: 'pending',
        active: false, // Inativo até ser aprovado
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        authorizationStatus: true,
        requestedAt: true,
      },
    });

    return user;
  },

  async getPendingRequests() {
    return prisma.user.findMany({
      where: {
        authorizationStatus: 'pending',
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        requestedAt: true,
        createdAt: true,
      },
      orderBy: {
        requestedAt: 'asc',
      },
    });
  },

  async approveUser(data: ApproveUserInput, approvedById: number) {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new AppError(404, 'Usuário não encontrado');
    }

    if (user.authorizationStatus !== 'pending') {
      throw new AppError(400, 'Usuário já foi processado');
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: {
        authorizationStatus: 'approved',
        role: data.role,
        active: true,
        approvedAt: new Date(),
        approvedById: approvedById,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        authorizationStatus: true,
        active: true,
        approvedAt: true,
      },
    });

    return updated;
  },

  async rejectUser(data: RejectUserInput) {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new AppError(404, 'Usuário não encontrado');
    }

    if (user.authorizationStatus !== 'pending') {
      throw new AppError(400, 'Usuário já foi processado');
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: {
        authorizationStatus: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: data.reason || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        authorizationStatus: true,
        rejectedAt: true,
        rejectionReason: true,
      },
    });

    return updated;
  },
};
