import { Request, Response, NextFunction } from 'express';
import { overdueService } from '../services/overdue.service.js';

export const overdueController = {
  /** GET /overdue — alertas ativos para o banner */
  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const alerts = await overdueService.getActiveAlerts(user.id, user.role);
      res.json(alerts);
    } catch (err) {
      next(err);
    }
  },

  /** POST /overdue/acknowledge — dispensar todos os alertas ativos */
  async acknowledgeAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      await overdueService.acknowledgeAll(user.id, user.role);
      res.json({ message: 'Alertas dispensados' });
    } catch (err) {
      next(err);
    }
  },

  /** POST /overdue/:id/acknowledge — dispensar um alerta específico */
  async acknowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await overdueService.acknowledge(id);
      res.json({ message: 'Alerta dispensado' });
    } catch (err) {
      next(err);
    }
  },

  /** GET /overdue/history — histórico de alertas */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, limit, offset } = req.query;
      const result = await overdueService.getHistory({
        userId: userId ? Number(userId) : undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
