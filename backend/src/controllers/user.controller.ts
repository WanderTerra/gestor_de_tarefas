import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { auditService } from '../services/audit.service.js';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';

export const userController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.findAll();
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = await userService.findById(id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await userService.create(data);

      // Auditoria
      await auditService.log({
        userId: req.user!.id,
        action: 'create',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ username: user.username, name: user.name, role: user.role }),
      });

      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = updateUserSchema.parse(req.body);
      const user = await userService.update(id, data);

      // Auditoria
      await auditService.log({
        userId: req.user!.id,
        action: 'update',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ changes: Object.keys(data) }),
      });

      res.json(user);
    } catch (err) {
      next(err);
    }
  },
};
