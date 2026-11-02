import { prisma } from '../../../lib/prisma.js';
import { NotifyFreedSlotUseCase } from './NotifyFreedSlotUseCase.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateSpan } from '../../../utils/dateFormat.js';
import { renderNotificationEmail } from '../../../services/EmailService.js';
import { isValidRejectReason, REJECT_REASON_HINT } from '../../../domain/policies/RejectReasonPolicy.js';

export class ApproveRejectBookingUseCase {
  constructor({ bookingRepository, userRepository, notificationRepository, auditLogRepository, emailOutboxRepository, bookingSettingRepository, clashAttemptRepository, timetableRepository, roomRepository }) {
    this.notifyFreedSlot = new NotifyFreedSlotUseCase({ clashAttemptRepository, bookingRepository, timetableRepository, notificationRepository, roomRepository });
    this.bookingRepository = bookingRepository;
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
    this.emailOutboxRepository = emailOutboxRepository;
    this.bookingSettingRepository = bookingSettingRepository;
  }

  /**
   * A multi-day booking (shared groupId) is decided as one: approving any
   * day approves every day of it that may be approved now (pending, and —
   * when out of hours — already permitted by the Dean); rejecting rejects
   * every day still pending.
   */
  async approve({ bookingId, approver, confirmResponsible = false }) {
    const booking = await this._requireApprovable(bookingId, approver.id);
    const pendingDays = (await this._groupOf(booking)).filter((b) => b.status === 'pending');
    const targets = pendingDays.filter((b) => !b.isOutOfHours || b.facultyApprovedAt);
    if (!targets.length) {
      throw AppError.badRequest('การจองนอกเวลาราชการต้องได้รับอนุญาตจากคณบดีก่อน จึงจะอนุมัติได้');
    }
    if (targets.some((b) => b.isOutOfHours)) {
      if (!booking.roomResponsibleName || !booking.roomResponsiblePhone) {
        throw AppError.badRequest('การจองนอกเวลาทำการยังไม่มีผู้รับผิดชอบและเบอร์ติดต่อ');
      }
      if (confirmResponsible !== true) {
        throw AppError.badRequest('ต้องยืนยันผู้รับผิดชอบก่อนอนุมัติการจองนอกเวลาทำการ');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const target of targets) {
        if (!(await this._lockPendingBooking(tx, target.id, { strict: target.id === booking.id && !booking.groupId }))) continue;
        saved.push(await this.bookingRepository.update(
          target.id,
          { status: 'approved', approvedBy: approver.id, approvedAt: new Date() },
          tx,
        ));
      }
      if (!saved.length) throw AppError.badRequest('Booking is already decided');
      for (const b of saved) {
        const approvedCard = { status: 'อนุมัติแล้ว', statusBg: '#dcfce7', statusColor: '#166534', unread: false, actions: [] };
        await this.notificationRepository.resolveApproverNotifications(b.id, approvedCard, tx);
        // Staff's "close to start, still not approved" alert (pendingAlertJob) is settled now.
        await this.notificationRepository.resolveNotificationsForAudience('staff', b.id, approvedCard, tx, 'booking');
      }
      const first = saved[0];
      await this.notificationRepository.addForUser(first.userId, {
        iconKey: 'ok', iconBg: '#dcfce7',
        title: `การจองห้อง ${first.room} ได้รับการอนุมัติ`,
        subtitle: `${formatDateSpan(saved.map((b) => b.date))} · ${first.time} · ${first.title}`,
        bookingId: first.id, kind: 'booking',
      }, tx);
      await this._queueManagementEmail(saved, tx);
      await this.auditLogRepository.create(
        { userId: approver.id, action: 'booking.approve', details: { bookingId: first.id, outcome: 'approved', ...(saved.length > 1 ? { bookingIds: saved.map((b) => b.id) } : {}) } },
        tx,
      );
      return saved;
    });

    const self = updated.find((b) => b.id === booking.id) || updated[0];
    return { success: true, booking: self, bookings: updated };
  }

  async reject({ bookingId, approver, reason }) {
    const booking = await this._requireApprovable(bookingId, approver.id);
    if (!reason?.trim()) throw AppError.badRequest('reject reason is required');
    if (!isValidRejectReason(reason)) throw AppError.badRequest(REJECT_REASON_HINT);
    reason = reason.trim();
    const targets = (await this._groupOf(booking)).filter((b) => b.status === 'pending');

    const updated = await prisma.$transaction(async (tx) => {
      const changes = { status: 'rejected', rejectReason: reason, approvedBy: approver.id, approvedAt: new Date() };
      const rejectedCard = { status: 'ปฏิเสธ', statusBg: '#fee2e2', statusColor: '#991b1b', unread: false, actions: [] };
      const saved = [];
      for (const target of targets) {
        if (!(await this._lockPendingBooking(tx, target.id, { strict: !booking.groupId }))) continue;
        const b = await this.bookingRepository.update(target.id, changes, tx);
        await this.notificationRepository.resolveApproverNotifications(b.id, rejectedCard, tx);
        await this.notificationRepository.closeStaffCardsForBooking(b.id, rejectedCard, tx);
        saved.push(b);
      }
      if (!saved.length) throw AppError.badRequest('Booking is already decided');
      const first = saved[0];
      await this.notificationRepository.addForUser(first.userId, {
        iconKey: 'no', iconBg: '#fee2e2',
        title: `การจองห้อง ${first.room} ถูกปฏิเสธ`,
        subtitle: `${formatDateSpan(saved.map((b) => b.date))} · ${first.time} · ${first.title} · เหตุผล: ${reason}`,
        bookingId: first.id, kind: 'booking',
      }, tx);
      await this.auditLogRepository.create(
        { userId: approver.id, action: 'booking.reject', details: { bookingId: first.id, reason, ...(saved.length > 1 ? { bookingIds: saved.map((b) => b.id) } : {}) } },
        tx,
      );
      return saved;
    });

    for (const b of updated) {
      await this.notifyFreedSlot.execute({ roomId: b.roomId, date: b.date, time: b.time })
        .catch((err) => console.error('[reject] freed-slot notice failed:', err));
    }

    const self = updated.find((b) => b.id === booking.id) || updated[0];
    return { success: true, booking: self, bookings: updated };
  }

  /** Every day of the booking's multi-day set, or just the booking itself. */
  async _groupOf(booking) {
    return booking.groupId ? this.bookingRepository.findGroup(booking.groupId) : [booking];
  }

  /** Locks the row; false when it is no longer pending (decided meanwhile) — `strict` throws instead. */
  async _lockPendingBooking(tx, bookingId, { strict = true } = {}) {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${Number(bookingId)} FOR UPDATE`;
    const current = await tx.booking.findUnique({ where: { id: Number(bookingId) }, select: { status: true } });
    if (current?.status === 'pending') return true;
    if (strict) throw AppError.badRequest(`Booking is already ${current?.status ?? 'missing'}`);
    return false;
  }

  /** `status: 'pending'` needs a department-level (head/vice-head) approver. Any other status means the booking was already decided. */
  async _requireApprovable(bookingId, approverId) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');

    if (booking.status !== 'pending') {
      throw AppError.badRequest(`Booking is already ${booking.status}`);
    }
    if (!(await this.userRepository.canApproveAtLevel(approverId, 'department'))) {
      throw AppError.forbidden('Requires a department-level approver for this stage');
    }
    return booking;
  }

  /**
   * FYI email to department approvers and Staff that a booking was approved
   * (they get no in-app card for it), queued with the approval itself and
   * sent by jobs/emailOutboxJob.js. The booker's own email comes with their
   * in-app notification (NotificationRepository).
   */
  async _queueManagementEmail(saved, client) {
    const setting = await this.bookingSettingRepository.get();
    if (!setting.emailNotificationsEnabled) return;
    const recipients = await this.userRepository.emailRecipients({ roles: ['staff'], approvers: true }, client);
    const first = saved[0];
    const mail = renderNotificationEmail({
      title: `การจองห้อง ${first.room} ได้รับการอนุมัติแล้ว`,
      subtitle: [
        `ผู้จอง: ${first.user}`,
        `วันที่: ${formatDateSpan(saved.map((b) => b.date))}`,
        `เวลา: ${first.time}`,
        `วัตถุประสงค์: ${first.title}`,
      ].join('\n'),
    });
    await this.emailOutboxRepository.enqueue({ recipients, ...mail, bookingId: first.id }, client);
  }
}
