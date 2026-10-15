import { prisma } from '../../lib/prisma.js';

const PUBLIC_SELECT = {
  id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true,
};

const toDateOnly = (d) => new Date(d).toISOString().slice(0, 10);

// Serialized into the frontend's User entity shape ({ id, name, email,
// role, status, joined }), with isActive/createdAt kept alongside for
// backend-internal use (AuthService's active-account check) — harmless
// extra keys the frontend's `new User(json)` constructor just ignores.
function serialize(row) {
  if (!row) return null;
  return {
    id: String(row.id), name: row.name, email: row.email, role: row.role,
    status: row.isActive ? 'active' : 'inactive', joined: toDateOnly(row.createdAt),
    isActive: row.isActive, createdAt: row.createdAt,
    ...(row.managementPositions && {
      positions: row.managementPositions.map(({ position: p }) => ({ id: p.id, positionName: p.positionName, canApprove: p.canApprove })),
    }),
  };
}

export class UserRepository {
  async getAll() {
    const rows = await prisma.user.findMany({
      select: { ...PUBLIC_SELECT, managementPositions: { select: { position: true }, orderBy: { positionId: 'asc' } } },
      orderBy: { id: 'asc' },
    });
    return rows.map(serialize);
  }

  async findById(id) {
    const row = await prisma.user.findUnique({ where: { id: Number(id) }, select: PUBLIC_SELECT });
    return serialize(row);
  }

  async count({ activeOnly } = {}) {
    const where = {};
    if (activeOnly) where.isActive = true;
    return prisma.user.count({ where });
  }

  /** { teacher: n, staff: n, admin: n } — active users only. */
  async countByRole() {
    const rows = await prisma.user.groupBy({ by: ['role'], where: { isActive: true }, _count: { _all: true } });
    return rows.reduce((acc, r) => ({ ...acc, [r.role]: r._count._all }), {});
  }

  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  /** Includes the password hash — only for login. Unserialized (raw isActive boolean, no `status` string). */
  async findAuthByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async add({ name, email, role, password }, client = prisma) {
    const row = await client.user.create({ data: { name, email, role, password }, select: PUBLIC_SELECT });
    return serialize(row);
  }

  async update(id, changes) {
    const row = await prisma.user.update({ where: { id: Number(id) }, data: changes, select: PUBLIC_SELECT });
    return serialize(row);
  }

  /** True if this user has ever made or approved a booking — Booking.userId/
   * approvedBy both default to Restrict on delete, so a hard delete would
   * fail at the DB level anyway; checked upfront for a clean error message
   * instead of surfacing a raw FK-constraint failure. */
  async hasBookingHistory(userId) {
    const count = await prisma.booking.count({
      where: { OR: [{ userId: Number(userId) }, { approvedBy: Number(userId) }] },
    });
    return count > 0;
  }

  async remove(id) {
    await prisma.user.delete({ where: { id: Number(id) } });
  }

  /**
   * Every user holding at least one can_approve management position at the
   * given level (head/vice-head, today's only approvers) — the
   * approval-notification/email audience.
   */
  async getApprovers({ level = 'department' } = {}) {
    const rows = await prisma.user.findMany({
      where: { isActive: true, managementPositions: { some: { position: { canApprove: true, level } } } },
      select: PUBLIC_SELECT,
    });
    return rows.map(serialize);
  }

  async getStaff() {
    const rows = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: PUBLIC_SELECT });
    return rows.map(serialize);
  }

  /** True if this user holds any management position with can_approve = true (any level). */
  async canApprove(userId) {
    const count = await prisma.userManagementPosition.count({
      where: { userId: Number(userId), position: { canApprove: true } },
    });
    return count > 0;
  }

  /** True if this user holds a can_approve position at exactly this level — the gate ApproveRejectBookingUseCase needs. */
  async canApproveAtLevel(userId, level) {
    const count = await prisma.userManagementPosition.count({
      where: { userId: Number(userId), position: { canApprove: true, level } },
    });
    return count > 0;
  }
}
