import { prisma } from '../config/prisma.js';

interface AuditEntry {
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  details?: string;
}

export const auditService = {
  /** Registrar uma ação na auditoria */
  async log(entry: AuditEntry) {
    return prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        details: entry.details ?? null,
      },
    });
  },

  /** Listar logs de auditoria (com filtros opcionais) */
  async findAll(filters?: {
    entity?: string;
    entityId?: number;
    userId?: number;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.entity) where.entity = filters.entity;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.userId) where.userId = filters.userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  },
};
