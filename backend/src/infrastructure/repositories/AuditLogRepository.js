import { prisma } from '../../lib/prisma.js';

export class AuditLogRepository {
  async create({ userId, action, details }, client = prisma) {
    return client.auditLog.create({
      data: { userId: userId ? Number(userId) : null, action, details: details ?? undefined },
    });
  }

  /** month: "YYYY-MM" — entries created in that calendar month (server-local time). */
  async getAll({ userId, action, month, limit = 2000 } = {}) {
    const where = {};
    if (userId) where.userId = Number(userId);
    if (action) where.action = action;
    if (/^\d{4}-\d{2}$/.test(month || '')) {
      const [y, m] = month.split('-').map(Number);
      where.createdAt = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }
    return prisma.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }
}
