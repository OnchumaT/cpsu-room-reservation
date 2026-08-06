import { prisma } from '../../lib/prisma.js';

// Serialized into the frontend's Notification entity shape:
// { id, unr, icKey, ibg, title, sub, time, st, stBg, stC, acts, bookingId, kind }
function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    unr: row.unread,
    icKey: row.iconKey,
    ibg: row.iconBg,
    title: row.title,
    sub: row.subtitle,
    time: row.createdAt,
    st: row.status,
    stBg: row.statusBg,
    stC: row.statusColor,
    acts: row.actions ?? [],
    bookingId: row.bookingId ? String(row.bookingId) : null,
    kind: row.kind === 'facility_request' ? 'facility-request' : row.kind === 'user_registration' ? 'user-registration' : 'booking',
  };
}

export class NotificationRepository {
  async getByAudience(audience) {
    const rows = await prisma.notification.findMany({ where: { audience }, orderBy: { createdAt: 'desc' } });
    return rows.map(serialize);
  }

  /** Merges several audiences into one time-ordered inbox — used for a canApprove
   * user, whose inbox is their own role's audience plus 'approvers'. */
  async getByAudiences(audiences) {
    const rows = await prisma.notification.findMany({ where: { audience: { in: audiences } }, orderBy: { createdAt: 'desc' } });
    return rows.map(serialize);
  }

  async findById(id) {
    const row = await prisma.notification.findUnique({ where: { id: Number(id) } });
    return serialize(row);
  }

  /** A single user's personal notifications (e.g. the 30-min booking reminder) — separate from the broadcast-to-audience inboxes above. */
  async getByUserId(userId) {
    const rows = await prisma.notification.findMany({ where: { userId: Number(userId) }, orderBy: { createdAt: 'desc' } });
    return rows.map(serialize);
  }

  /**
   * @param {string} audience
   * @param {{title:string, subtitle?:string, iconKey?:string, iconBg?:string, unread?:boolean,
   *   status?:string, statusBg?:string, statusColor?:string, actions?:object[],
   *   bookingId?:number, kind?:'booking'|'facility-request'|'user-registration'}} data
   */
  async addForAudience(audience, data, client = prisma) {
    const row = await client.notification.create({
      data: {
        audience,
        unread: data.unread ?? true,
        iconKey: data.iconKey ?? null,
        iconBg: data.iconBg ?? null,
        title: data.title,
        subtitle: data.subtitle ?? null,
        status: data.status ?? null,
        statusBg: data.statusBg ?? null,
        statusColor: data.statusColor ?? null,
        actions: data.actions ?? [],
        bookingId: data.bookingId ? Number(data.bookingId) : null,
        kind: data.kind === 'facility-request' ? 'facility_request' : data.kind === 'user-registration' ? 'user_registration' : 'booking',
      },
    });
    return serialize(row);
  }

  /** Same data shape as addForAudience, but targeted at one user instead of broadcast to a role. */
  async addForUser(userId, data, client = prisma) {
    const row = await client.notification.create({
      data: {
        userId: Number(userId),
        unread: data.unread ?? true,
        iconKey: data.iconKey ?? null,
        iconBg: data.iconBg ?? null,
        title: data.title,
        subtitle: data.subtitle ?? null,
        status: data.status ?? null,
        statusBg: data.statusBg ?? null,
        statusColor: data.statusColor ?? null,
        actions: data.actions ?? [],
        bookingId: data.bookingId ? Number(data.bookingId) : null,
        kind: data.kind === 'facility-request' ? 'facility_request' : data.kind === 'user-registration' ? 'user_registration' : 'booking',
      },
    });
    return serialize(row);
  }

  async update(id, changes) {
    const data = {};
    if (changes.unread !== undefined) data.unread = changes.unread;
    if (changes.status !== undefined) data.status = changes.status;
    if (changes.statusBg !== undefined) data.statusBg = changes.statusBg;
    if (changes.statusColor !== undefined) data.statusColor = changes.statusColor;
    if (changes.actions !== undefined) data.actions = changes.actions;
    const row = await prisma.notification.update({ where: { id: Number(id) }, data });
    return serialize(row);
  }
}
