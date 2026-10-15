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

  /** Gives `positionId` to this user and drops any of `exclusiveWithIds` they hold;
   * with `soleHolder`, every other holder loses it too — one transaction. */
  async assignExclusive(userId, positionId, exclusiveWithIds, { soleHolder = false } = {}) {
    const uid = Number(userId);
    const pid = Number(positionId);
    await prisma.$transaction([
      ...(soleHolder ? [prisma.userManagementPosition.deleteMany({ where: { positionId: pid, userId: { not: uid } } })] : []),
      prisma.userManagementPosition.deleteMany({ where: { userId: uid, positionId: { in: exclusiveWithIds.map(Number).filter((id) => id !== pid) } } }),
      prisma.userManagementPosition.upsert({
        where: { userId_positionId: { userId: uid, positionId: pid } },
        update: {},
        create: { userId: uid, positionId: pid },
      }),
    ]);
  }

  async unassign(userId, positionId) {
    await prisma.userManagementPosition.deleteMany({
      where: { userId: Number(userId), positionId: Number(positionId) },
    });
  }
}
