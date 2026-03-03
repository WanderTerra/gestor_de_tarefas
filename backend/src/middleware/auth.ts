import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';

// Helper para verificar se é administrador
export function isManagerRole(role: string): boolean {
  return role === 'adm';
}

// Helper para verificar se é employee (todos exceto adm)
export function isEmployeeRole(role: string): boolean {
  return role !== 'adm';
}

// Extender o tipo Request do Express para incluir o usuário autenticado
export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string; // 'adm' | 'backoffice' | 'supervisor' | 'financeiro' | 'rh' | 'monitor'
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
      select: { id: true, username: true, name: true, role: true, active: true, authorizationStatus: true },
    });

    if (!user || !user.active) {
      throw new AppError(401, 'Usuário não encontrado ou desativado');
    }

    // Verificar se o usuário está autorizado (exceto para rotas públicas)
    if (user.authorizationStatus !== 'approved') {
      throw new AppError(403, 'Acesso não autorizado. Aguarde a aprovação do gestor.');
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware que verifica se o usuário tem a role necessária
 * Aceita 'manager' para compatibilidade (será tratado como 'adm')
 */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Não autenticado'));
    }

    // Converter 'manager' para 'adm' para compatibilidade
    const normalizedRoles = roles.map(r => r === 'manager' ? 'adm' : r);
    
    if (!normalizedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'Sem permissão para esta ação'));
    }

    next();
  };
}
