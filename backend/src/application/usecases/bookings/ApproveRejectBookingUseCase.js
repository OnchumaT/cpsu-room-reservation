import { prisma } from '../../../lib/prisma.js';
import { NotifyFreedSlotUseCase } from './NotifyFreedSlotUseCase.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateDMY } from '../../../utils/dateFormat.js';

export class ApproveRejectBookingUseCase {
  constructor({ bookingRepository, userRepository, notificationRepository, auditLogRepository, emailService, bookingSettingRepository, clashAttemptRepository, timetableRepository, roomRepository }) {
    this.notifyFreedSlot = new NotifyFreedSlotUseCase({ clashAttemptRepository, bookingRepository, timetableRepository, notificationRepository, roomRepository });
    this.bookingRepository = bookingRepository;
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
    this.emailService = emailService;
    this.bookingSettingRepository = bookingSettingRepository;
  }

  async approve({ bookingId, approver, confirmResponsible = false }) {
    const booking = await this._requireApprovable(bookingId, approver.id);
    if (booking.isOutOfHours) {
      if (!booking.roomResponsibleName || !booking.roomResponsiblePhone) {
        throw AppError.badRequest('การจองนอกเวลาทำการยังไม่มีผู้รับผิดชอบและเบอร์ติดต่อ');
      }
      if (confirmResponsible !== true) {
        throw AppError.badRequest('ต้องยืนยันผู้รับผิดชอบก่อนอนุมัติการจองนอกเวลาทำการ');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await this._lockPendingBooking(tx, bookingId);
      const saved = await this.bookingRepository.update(
        bookingId,
        { status: 'approved', approvedBy: approver.id, approvedAt: new Date() },
        tx,
      );
      await this.notificationRepository.resolveApproverNotifications(saved.id, {
        status: 'อนุมัติแล้ว', statusBg: '#dcfce7', statusColor: '#166534', unread: false, actions: [],
      }, tx);
      await this.notificationRepository.addForUser(saved.userId, {
        iconKey: 'ok', iconBg: '#dcfce7',
        title: `การจองห้อง ${saved.roomName ?? saved.room} ได้รับการอนุมัติ`,
        subtitle: `${formatDateDMY(saved.date)} · ${saved.time} · ${saved.title}`,
        bookingId: saved.id, kind: 'booking',
      }, tx);
      // Out-of-hours use of the building needs a formal memo to the Dean —
      // Staff prints it (from the booking's own data, via printFacultyMemo.js)
      // once the booking actually clears department approval.
      if (saved.isOutOfHours) {
        await this.notificationRepository.addForAudience('staff', {
          iconKey: 'file', iconBg: '#EEF0FF',
          title: `การจองห้อง ${saved.roomName ?? saved.room} (นอกเวลาราชการ) ผ่านภาควิชาแล้ว`,
          subtitle: `${formatDateDMY(saved.date)} · ${saved.time} · ${saved.title} · โปรดพิมพ์บันทึกข้อความแจ้งคณะ`,
          bookingId: saved.id, kind: 'booking',
        }, tx);
      }
      await this.auditLogRepository.create(
        { userId: approver.id, action: 'booking.approve', details: { bookingId: saved.id, outcome: 'approved' } },
        tx,
      );
      return saved;
    });

    // Best-effort and fire-and-forget: the approval is already committed, so
    // the response shouldn't wait on a live SMTP round-trip to Ethereal —
    // that's what was making every approve click feel slow.
    const setting = await this.bookingSettingRepository.get();
    if (setting.emailNotificationsEnabled) {
      this._notifyManagementByEmail(updated).catch((err) => {
        console.error('[ApproveRejectBookingUseCase] Failed to send approval email:', err);
      });
    }

    return { success: true, booking: updated };
  }

  async reject({ bookingId, approver, reason }) {
    await this._requireApprovable(bookingId, approver.id);
    if (!reason?.trim()) throw AppError.badRequest('reject reason is required');

    const updated = await prisma.$transaction(async (tx) => {
      await this._lockPendingBooking(tx, bookingId);
      const changes = { status: 'rejected', rejectReason: reason, approvedBy: approver.id, approvedAt: new Date() };
      const saved = await this.bookingRepository.update(bookingId, changes, tx);

      await this.notificationRepository.resolveApproverNotifications(saved.id, {
        status: 'ปฏิเสธ', statusBg: '#fee2e2', statusColor: '#991b1b', unread: false, actions: [],
      }, tx);
      await this.notificationRepository.addForUser(saved.userId, {
        iconKey: 'no', iconBg: '#fee2e2',
        title: `การจองห้อง ${saved.roomName ?? saved.room} ถูกปฏิเสธ`,
        subtitle: `${formatDateDMY(saved.date)} · ${saved.time} · ${saved.title} · เหตุผล: ${reason}`,
        bookingId: saved.id, kind: 'booking',
      }, tx);
      await this.auditLogRepository.create(
        { userId: approver.id, action: 'booking.reject', details: { bookingId: saved.id, reason } },
        tx,
      );
      return saved;
    });

    await this.notifyFreedSlot.execute({ roomId: updated.roomId, date: updated.date, time: updated.time })
      .catch((err) => console.error('[reject] freed-slot notice failed:', err));

    return { success: true, booking: updated };
  }

  async _lockPendingBooking(tx, bookingId) {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${Number(bookingId)} FOR UPDATE`;
    const current = await tx.booking.findUnique({ where: { id: Number(bookingId) }, select: { status: true } });
    if (current?.status !== 'pending') throw AppError.badRequest(`Booking is already ${current?.status ?? 'missing'}`);
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

  async _notifyManagementByEmail(booking) {
    const [approvers, staff] = await Promise.all([
      this.userRepository.getApprovers(),
      this.userRepository.getStaff(),
    ]);
    const recipients = [...new Map([...approvers, ...staff].map((u) => [u.id, u])).values()];
    if (!recipients.length) return;
    await this.emailService.sendBookingApprovedNotice({ to: recipients.map((u) => u.email), booking });
  }
}
