import { prisma } from '../../lib/prisma.js';

export class AuditLogRepository {
  async create({ userId, action, details }, client = prisma) {
    return client.auditLog.create({
      data: { userId: userId ? Number(userId) : null, action, details: details ?? undefined },
    });
  }

  async getAll({ userId, action, limit = 200 } = {}) {
    const where = {};
    if (userId) where.userId = Number(userId);
    if (action) where.action = action;
    return prisma.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }
}
