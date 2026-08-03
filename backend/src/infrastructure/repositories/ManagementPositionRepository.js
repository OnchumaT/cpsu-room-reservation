import { prisma } from '../../lib/prisma.js';

export class ManagementPositionRepository {
  async getAll() {
    return prisma.managementPosition.findMany({ orderBy: { id: 'asc' } });
  }

  async findById(id) {
    return prisma.managementPosition.findUnique({ where: { id: Number(id) } });
  }

  async add({ positionName, canApprove = false }) {
    return prisma.managementPosition.create({ data: { positionName, canApprove } });
  }

  async getForUser(userId) {
    const rows = await prisma.userManagementPosition.findMany({
      where: { userId: Number(userId) },
      include: { position: true },
    });
    return rows.map((r) => r.position);
  }

  async assign(userId, positionId) {
    return prisma.userManagementPosition.upsert({
      where: { userId_positionId: { userId: Number(userId), positionId: Number(positionId) } },
      update: {},
      create: { userId: Number(userId), positionId: Number(positionId) },
    });
  }

  async unassign(userId, positionId) {
    await prisma.userManagementPosition.deleteMany({
      where: { userId: Number(userId), positionId: Number(positionId) },
    });
  }
}
