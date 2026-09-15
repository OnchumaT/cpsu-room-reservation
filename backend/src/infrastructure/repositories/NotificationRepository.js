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
  /** `since` (optional) excludes broadcast notifications older than a
   * user's own account — a new signup shouldn't see years of other
   * people's "your booking was approved" history that was never theirs
   * to begin with. Doesn't affect anyone who already existed when those
   * rows were created — nothing is deleted, just filtered per-viewer. */
  async getByAudience(audience, since) {
    const where = { audience };
    if (since) where.createdAt = { gte: since };
    const rows = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } });
    return rows.map(serialize);
  }

  /** Merges several audiences into one time-ordered inbox — used for a canApprove
   * user, whose inbox is their own role's audience plus 'approvers'. */
  async getByAudiences(audiences, since) {
    const where = { audience: { in: audiences } };
    if (since) where.createdAt = { gte: since };
    const rows = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } });
    return rows.map(serialize);
  }

  async findById(id) {
    const row = await prisma.notification.findUnique({ where: { id: Number(id) } });
    return serialize(row);
  }

  /** Raw owner fields for the authorization check on POST /notifications/:id/action — kept
   * out of the public serialize() shape since the frontend never needs to see them. */
  async getOwnership(id) {
    return prisma.notification.findUnique({ where: { id: Number(id) }, select: { userId: true, audience: true } });
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

  /** Resolves the broadcast notification tied to a booking for one
   * audience (e.g. 'approvers') — called from
   * ApproveRejectBookingUseCase and CancelBookingUseCase so any decision
   * made on the booking (approve, reject, or cancel) clears the stale
   * pending card everywhere instead of leaving it stuck showing actions
   * on an already-decided booking. Scoped by audience so it can't touch
   * the requester's own personal "approved"/"rejected"/"cancelled"
   * notification for the same booking (that one has no audience — it's
   * addForUser'd — so this updateMany simply won't match it). */
  async resolveNotificationsForAudience(audience, bookingId, changes, client = prisma) {
    await client.notification.updateMany({
      where: { audience, bookingId: Number(bookingId) },
      data: changes,
    });
  }

  /** Thin wrapper kept for the many existing call sites that only ever resolved the 'approvers' (department-stage) audience. */
  async resolveApproverNotifications(bookingId, changes, client = prisma) {
    return this.resolveNotificationsForAudience('approvers', bookingId, changes, client);
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
