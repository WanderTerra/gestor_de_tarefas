import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { auditService } from '../services/audit.service.js';
import { loginSchema, registerSchema, approveUserSchema, rejectUserSchema } from '../schemas/auth.schema.js';

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

  /** Registro público - qualquer um pode se cadastrar */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const user = await authService.register(data);

      res.status(201).json({
        message: 'Cadastro realizado com sucesso. Aguarde a aprovação do gestor.',
        user,
      });
    } catch (err) {
      next(err);
    }
  },

  /** Listar solicitações pendentes (apenas gestores) */
  async getPendingRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await authService.getPendingRequests();
      res.json(requests);
    } catch (err) {
      next(err);
    }
  },

  /** Aprovar solicitação de acesso (apenas gestores) */
  async approveUser(req: Request, res: Response, next: NextFunction) {
    try {
      const data = approveUserSchema.parse(req.body);
      const user = await authService.approveUser(data, req.user!.id);

      // Auditoria
      await auditService.log({
        userId: req.user!.id,
        action: 'approve',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ username: user.username, role: user.role }),
      });

      res.json({
        message: 'Usuário aprovado com sucesso',
        user,
      });
    } catch (err) {
      next(err);
    }
  },

  /** Rejeitar solicitação de acesso (apenas gestores) */
  async rejectUser(req: Request, res: Response, next: NextFunction) {
    try {
      const data = rejectUserSchema.parse(req.body);
      const user = await authService.rejectUser(data);

      // Auditoria
      await auditService.log({
        userId: req.user!.id,
        action: 'reject',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ reason: data.reason || 'Sem motivo informado' }),
      });

      res.json({
        message: 'Solicitação rejeitada',
        user,
      });
    } catch (err) {
      next(err);
    }
  },
};
