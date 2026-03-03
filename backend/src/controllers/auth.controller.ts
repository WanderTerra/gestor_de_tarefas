import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { auditService } from '../services/audit.service.js';
import { loginSchema } from '../schemas/auth.schema.js';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data);

      // Registrar login na auditoria (não bloqueia se falhar)
      auditService.log({
        userId: result.user.id,
        action: 'login',
        entity: 'auth',
        details: JSON.stringify({ username: result.user.username }),
      }).catch((err) => {
        console.error('⚠️ Erro ao registrar login na auditoria:', err);
        // Não bloqueia o login se a auditoria falhar
      });

      res.json(result);
    } catch (err) {
      console.error('❌ Erro no login:', err);
      next(err);
    }
  },

  /** Retorna o usuário autenticado (para validar token) */
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ user: req.user });
    } catch (err) {
      next(err);
    }
  },
};
