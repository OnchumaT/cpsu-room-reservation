import { prisma } from '../../lib/prisma.js';

export class ManagementPositionRepository {
  async getAll() {
    return prisma.managementPosition.findMany({ orderBy: { id: 'asc' } });
  }

  /**
   * The current head of department: the active holder of the department-level
   * approver position that isn't a "รอง…" (vice) one. Signs every
   * out-of-hours memo to the Dean (printFacultyMemo.js).
   */
  async getDepartmentHead() {
    const row = await prisma.userManagementPosition.findFirst({
      where: {
        position: { canApprove: true, level: 'department', NOT: { positionName: { startsWith: 'รอง' } } },
        user: { isActive: true },
      },
      include: { user: { select: { id: true, name: true } }, position: { select: { positionName: true } } },
      orderBy: { id: 'asc' },
    });
    return row ? { id: row.user.id, name: row.user.name, positionName: row.position.positionName } : null;
  }

  /** { name, positionName } of every active position holder — printed as their title on forms. */
  async listHolders() {
    const rows = await prisma.userManagementPosition.findMany({
      where: { user: { isActive: true } },
      include: { user: { select: { name: true } }, position: { select: { positionName: true } } },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => ({ name: r.user.name, positionName: r.position.positionName }));
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
