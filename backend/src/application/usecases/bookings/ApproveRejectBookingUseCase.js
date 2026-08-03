import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';

export class ApproveRejectBookingUseCase {
  constructor({ bookingRepository, userRepository, notificationRepository, auditLogRepository, emailService }) {
    this.bookingRepository = bookingRepository;
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
    this.emailService = emailService;
  }

  async approve({ bookingId, approver }) {
    await this._requirePending(bookingId);

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await this.bookingRepository.update(
        bookingId,
        { status: 'approved', approvedBy: approver.id, approvedAt: new Date() },
        tx,
      );
      await this.notificationRepository.addForAudience(saved.role, {
        iconKey: 'ok', iconBg: '#dcfce7',
        title: `การจองห้อง ${saved.roomName ?? saved.room} ได้รับการอนุมัติ`,
        subtitle: `${saved.date} · ${saved.time} · ${saved.title}`,
        bookingId: saved.id, kind: 'booking',
      }, tx);
      await this.auditLogRepository.create(
        { userId: approver.id, action: 'booking.approve', details: { bookingId: saved.id } },
        tx,
      );
      return saved;
    });

    // Best-effort and fire-and-forget: the approval is already committed, so
    // the response shouldn't wait on a live SMTP round-trip to Ethereal —
    // that's what was making every approve click feel slow.
    this._notifyManagementByEmail(updated).catch((err) => {
      console.error('[ApproveRejectBookingUseCase] Failed to send approval email:', err);
    });

    return { success: true, booking: updated };
  }

  async reject({ bookingId, approver, reason }) {
    await this._requirePending(bookingId);
    if (!reason?.trim()) throw AppError.badRequest('reject reason is required');

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await this.bookingRepository.update(
        bookingId,
        { status: 'rejected', approvedBy: approver.id, approvedAt: new Date(), rejectReason: reason },
        tx,
      );
      await this.notificationRepository.addForAudience(saved.role, {
        iconKey: 'no', iconBg: '#fee2e2',
        title: `การจองห้อง ${saved.roomName ?? saved.room} ถูกปฏิเสธ`,
        subtitle: `${saved.date} · ${saved.time} · ${saved.title} · เหตุผล: ${reason}`,
        bookingId: saved.id, kind: 'booking',
      }, tx);
      await this.auditLogRepository.create(
        { userId: approver.id, action: 'booking.reject', details: { bookingId: saved.id, reason } },
        tx,
      );
      return saved;
    });

    return { success: true, booking: updated };
  }

  async _requirePending(bookingId) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.status !== 'pending') throw AppError.badRequest(`Booking is already ${booking.status}`);
    return booking;
  }

  async _notifyManagementByEmail(booking) {
    const [approvers, staff] = await Promise.all([this.userRepository.getApprovers(), this.userRepository.getStaff()]);
    const recipients = [...new Map([...approvers, ...staff].map((u) => [u.id, u])).values()];
    if (!recipients.length) return;
    await this.emailService.sendBookingApprovedNotice({ to: recipients.map((u) => u.email), booking });
  }
}
