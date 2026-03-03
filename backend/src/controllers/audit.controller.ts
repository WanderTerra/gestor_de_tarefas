import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service.js';

export const auditController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { entity, entityId, userId, limit, offset } = req.query;

      const result = await auditService.findAll({
        entity: entity as string | undefined,
        entityId: entityId ? Number(entityId) : undefined,
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
