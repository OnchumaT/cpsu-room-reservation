import { prisma } from '../../lib/prisma.js';
import { renderNotificationEmail } from '../../services/EmailService.js';

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
  /** `emailOutboxRepository`: every notification created here is also queued as an email (see _mirrorToEmail). */
  constructor({ emailOutboxRepository } = {}) {
    this.emailOutboxRepository = emailOutboxRepository;
  }

  /**
   * Who gets the email copy of a notification: the one user, or everyone
   * the audience inbox shows it to — active, not opted out (Profile), and
   * only while the department-wide email switch (SettingsView) is on.
   */
  async _emailRecipients({ userId, audience }, client) {
    const setting = await client.bookingSetting.findFirst({ orderBy: { id: 'desc' }, select: { emailNotificationsEnabled: true } });
    if (setting && !setting.emailNotificationsEnabled) return [];
    const base = { isActive: true, emailNotifications: true };
    let where;
    if (userId) where = { ...base, id: Number(userId) };
    // The 'approvers' inbox is merged into every can_approve holder's (see getByAudiences).
    else if (audience === 'approvers') where = { ...base, managementPositions: { some: { position: { canApprove: true } } } };
    else if (['teacher', 'staff', 'admin'].includes(audience)) where = { ...base, role: audience };
    else return [];
    const users = await client.user.findMany({ where, select: { email: true } });
    return users.map((u) => u.email).filter(Boolean);
  }

  /** Queues the email copy in the same transaction as the notification, so both or neither exist. */
  async _mirrorToEmail(row, target, client) {
    if (!this.emailOutboxRepository) return;
    const recipients = await this._emailRecipients(target, client);
    if (!recipients.length) return;
    const mail = renderNotificationEmail({ title: row.title, subtitle: row.subtitle });
    await this.emailOutboxRepository.enqueue({ recipients, ...mail, notificationId: row.id, bookingId: row.bookingId }, client);
  }

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
    await this._mirrorToEmail(row, { audience }, client);
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
    await this._mirrorToEmail(row, { userId }, client);
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
  // `kind` (optional, raw DB enum value e.g. 'facility_request') narrows the
  // match — a booking can have both a 'booking'-kind and a
  // 'facility_request'-kind staff card, and resolving one must not stomp
  // the other's status/color.
  async resolveNotificationsForAudience(audience, bookingId, changes, client = prisma, kind) {
    const where = { audience, bookingId: Number(bookingId) };
    if (kind) where.kind = kind;
    await client.notification.updateMany({ where, data: changes });
  }

  /**
   * A booking that is cancelled, rejected or expired leaves Staff with
   * nothing to do — every Staff card about it (the facility request card,
   * the "print the Dean memo" card) gets its final status and loses its
   * buttons, so none of them keeps saying "รอ".
   */
  async closeStaffCardsForBooking(bookingId, changes, client = prisma) {
    await client.notification.updateMany({
      where: { audience: 'staff', bookingId: Number(bookingId), kind: { in: ['booking', 'facility_request'] } },
      data: { ...changes, actions: [] },
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
