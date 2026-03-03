import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';

// Extender o tipo Request do Express para incluir o usuário autenticado
export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: 'manager' | 'employee';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware que verifica se o JWT é válido e anexa o usuário no req.user
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Token de autenticação não fornecido');
    }

    const token = authHeader.split(' ')[1];

    let payload: { userId: number };
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as { userId: number };
    } catch {
      throw new AppError(401, 'Token inválido ou expirado');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, name: true, role: true, active: true },
    });

    if (!user || !user.active) {
      throw new AppError(401, 'Usuário não encontrado ou desativado');
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'manager' | 'employee',
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware que verifica se o usuário tem a role necessária
 */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Não autenticado'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Sem permissão para esta ação'));
    }

    next();
  };
}
