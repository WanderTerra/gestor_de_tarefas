import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Erro de validação Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors.map(e => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
    });
    return;
  }

  // Erro da aplicação (controlado)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Erro inesperado
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
