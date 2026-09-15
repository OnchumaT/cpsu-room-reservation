import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';

export class ApproveRejectBookingUseCase {
  constructor({ bookingRepository, userRepository, notificationRepository, auditLogRepository, emailService, bookingSettingRepository }) {
    this.bookingRepository = bookingRepository;
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
    this.emailService = emailService;
    this.bookingSettingRepository = bookingSettingRepository;
  }

  async approve({ bookingId, approver }) {
    const { booking, stage } = await this._requireApprovable(bookingId, approver.id);

    const updated = await prisma.$transaction(async (tx) => {
      let saved;
      if (stage === 'department' && booking.requiresFacultyApproval) {
        // Stage 1 of 2 for an out-of-hours booking — department approved,
        // now hand off to the faculty/dean stage. Not fully approved yet.
        saved = await this.bookingRepository.update(
          bookingId,
          { status: 'pending_faculty', approvedBy: approver.id, approvedAt: new Date() },
          tx,
        );
        await this.notificationRepository.resolveApproverNotifications(saved.id, {
          status: 'อนุมัติระดับภาควิชาแล้ว', statusBg: '#EEF0FF', statusColor: '#38419D', unread: false, actions: [],
        }, tx);
        await this.notificationRepository.addForAudience('faculty_approvers', {
          iconKey: 'cal', iconBg: '#FEF3C7',
          title: `การจองห้อง ${saved.roomName ?? saved.room} (นอกเวลาราชการ) รอการอนุมัติจากคณะ`,
          subtitle: `${saved.date} · ${saved.time} · ${saved.title} · ผ่านภาควิชาแล้วโดย ${approver.name}`,
          status: 'รออนุมัติ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
          bookingId: saved.id, kind: 'booking',
        }, tx);
        await this.notificationRepository.addForUser(saved.userId, {
          iconKey: 'cal', iconBg: '#EEF0FF',
          title: `การจองห้อง ${saved.roomName ?? saved.room} ผ่านภาควิชาแล้ว รอคณะอนุมัติ`,
          subtitle: `${saved.date} · ${saved.time} · ${saved.title}`,
          bookingId: saved.id, kind: 'booking',
        }, tx);
        await this.auditLogRepository.create(
          { userId: approver.id, action: 'booking.approve', details: { bookingId: saved.id, stage: 'department', outcome: 'awaiting_faculty' } },
          tx,
        );
        return saved;
      }

      if (stage === 'faculty') {
        // Stage 2 of 2 — fully approved.
        saved = await this.bookingRepository.update(
          bookingId,
          { status: 'approved', facultyApprovedBy: approver.id, facultyApprovedAt: new Date() },
          tx,
        );
        await this.notificationRepository.resolveNotificationsForAudience('faculty_approvers', saved.id, {
          status: 'อนุมัติแล้ว', statusBg: '#dcfce7', statusColor: '#166534', unread: false, actions: [],
        }, tx);
        await this.notificationRepository.addForUser(saved.userId, {
          iconKey: 'ok', iconBg: '#dcfce7',
          title: `การจองห้อง ${saved.roomName ?? saved.room} ได้รับการอนุมัติ (ผ่านคณะแล้ว)`,
          subtitle: `${saved.date} · ${saved.time} · ${saved.title}`,
          bookingId: saved.id, kind: 'booking',
        }, tx);
        await this.auditLogRepository.create(
          { userId: approver.id, action: 'booking.approve', details: { bookingId: saved.id, stage: 'faculty', outcome: 'approved' } },
          tx,
        );
        return saved;
      }

      // stage === 'department', not requiresFacultyApproval — today's unchanged single-stage path.
      saved = await this.bookingRepository.update(
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
        subtitle: `${saved.date} · ${saved.time} · ${saved.title}`,
        bookingId: saved.id, kind: 'booking',
      }, tx);
      await this.auditLogRepository.create(
        { userId: approver.id, action: 'booking.approve', details: { bookingId: saved.id, stage: 'department', outcome: 'approved' } },
        tx,
      );
      return saved;
    });

    // Best-effort and fire-and-forget: the approval is already committed, so
    // the response shouldn't wait on a live SMTP round-trip to Ethereal —
    // that's what was making every approve click feel slow.
    const setting = await this.bookingSettingRepository.get();
    if (setting.emailNotificationsEnabled) {
      const awaitingFaculty = updated.status === 'pending_faculty';
      this._notifyManagementByEmail(updated, { level: awaitingFaculty ? 'faculty' : null }).catch((err) => {
        console.error('[ApproveRejectBookingUseCase] Failed to send approval email:', err);
      });
    }

    return { success: true, booking: updated };
  }

  async reject({ bookingId, approver, reason }) {
    const { stage } = await this._requireApprovable(bookingId, approver.id);
    if (!reason?.trim()) throw AppError.badRequest('reject reason is required');

    const updated = await prisma.$transaction(async (tx) => {
      const changes = { status: 'rejected', rejectReason: reason };
      if (stage === 'faculty') {
        changes.facultyApprovedBy = approver.id;
        changes.facultyApprovedAt = new Date();
      } else {
        changes.approvedBy = approver.id;
        changes.approvedAt = new Date();
      }
      const saved = await this.bookingRepository.update(bookingId, changes, tx);

      // The department-stage card always exists (created at booking time);
      // the faculty-stage card only exists once a department approval
      // handed the booking off — resolving both is a harmless no-op for
      // whichever one was never created.
      await this.notificationRepository.resolveApproverNotifications(saved.id, {
        status: 'ปฏิเสธ', statusBg: '#fee2e2', statusColor: '#991b1b', unread: false, actions: [],
      }, tx);
      if (stage === 'faculty') {
        await this.notificationRepository.resolveNotificationsForAudience('faculty_approvers', saved.id, {
          status: 'ปฏิเสธ', statusBg: '#fee2e2', statusColor: '#991b1b', unread: false, actions: [],
        }, tx);
      }
      await this.notificationRepository.addForUser(saved.userId, {
        iconKey: 'no', iconBg: '#fee2e2',
        title: `การจองห้อง ${saved.roomName ?? saved.room} ถูกปฏิเสธ${stage === 'faculty' ? ' (ระดับคณะ)' : ''}`,
        subtitle: `${saved.date} · ${saved.time} · ${saved.title} · เหตุผล: ${reason}`,
        bookingId: saved.id, kind: 'booking',
      }, tx);
      await this.auditLogRepository.create(
        { userId: approver.id, action: 'booking.reject', details: { bookingId: saved.id, reason, stage } },
        tx,
      );
      return saved;
    });

    return { success: true, booking: updated };
  }

  /**
   * Stage-aware replacement for the old flat "_requirePending" check.
   * `status: 'pending'` needs a department-level (head/vice-head) approver;
   * `status: 'pending_faculty'` (only reachable for a
   * requiresFacultyApproval booking) needs a faculty/dean-level approver.
   * Any other status means the booking was already decided.
   */
  async _requireApprovable(bookingId, approverId) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');

    if (booking.status === 'pending') {
      if (!(await this.userRepository.canApproveAtLevel(approverId, 'department'))) {
        throw AppError.forbidden('Requires a department-level approver for this stage');
      }
      return { booking, stage: 'department' };
    }
    if (booking.status === 'pending_faculty') {
      if (!(await this.userRepository.canApproveAtLevel(approverId, 'faculty'))) {
        throw AppError.forbidden('Requires a faculty-level (dean) approver for this stage');
      }
      return { booking, stage: 'faculty' };
    }
    throw AppError.badRequest(`Booking is already ${booking.status}`);
  }

  async _notifyManagementByEmail(booking, { level } = {}) {
    const [approvers, staff] = await Promise.all([
      this.userRepository.getApprovers(level ? { level } : undefined),
      this.userRepository.getStaff(),
    ]);
    const recipients = level
      ? approvers
      : [...new Map([...approvers, ...staff].map((u) => [u.id, u])).values()];
    if (!recipients.length) return;
    await this.emailService.sendBookingApprovedNotice({ to: recipients.map((u) => u.email), booking });
  }
}
