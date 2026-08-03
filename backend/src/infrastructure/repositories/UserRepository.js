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
  };
}

export class UserRepository {
  async getAll() {
    const rows = await prisma.user.findMany({ select: PUBLIC_SELECT, orderBy: { id: 'asc' } });
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

  /** Every user holding at least one can_approve management position — the approval-notification/email audience. */
  async getApprovers() {
    const rows = await prisma.user.findMany({
      where: { isActive: true, managementPositions: { some: { position: { canApprove: true } } } },
      select: PUBLIC_SELECT,
    });
    return rows.map(serialize);
  }

  async getStaff() {
    const rows = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: PUBLIC_SELECT });
    return rows.map(serialize);
  }

  /** True if this user holds any management position with can_approve = true. */
  async canApprove(userId) {
    const count = await prisma.userManagementPosition.count({
      where: { userId: Number(userId), position: { canApprove: true } },
    });
    return count > 0;
  }
}
