import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateDMY } from '../../../utils/dateFormat.js';
import { NotifyFreedSlotUseCase } from './NotifyFreedSlotUseCase.js';

const RESULT_LABEL = {
  approved: 'คณบดีอนุญาต',
  rejected: 'คณบดีไม่อนุญาต',
};

/**
 * Out-of-hours bookings need the Dean's permission BEFORE the department
 * (head/vice-head) may approve them. The Dean doesn't use the system: Staff
 * prints the memo (printFacultyMemo.js), and records the Dean's answer here.
 *
 * - permitted → facultyApprovedBy/At are set (by = the Staff member who
 *   recorded it), which unlocks ApproveRejectBookingUseCase.approve. If the
 *   booker is a department approver themselves, the booking is approved on
 *   the spot (same rule as their in-hours bookings); otherwise the approvers
 *   are notified now — not at creation, when they could not act on it yet.
 * - refused → the booking is rejected outright, the slot is freed.
 */
export class RecordFacultyResultUseCase {
  constructor(repositories) {
    const { bookingRepository, notificationRepository, auditLogRepository, userRepository } = repositories;
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
    this.userRepository = userRepository;
    this.notifyFreedSlot = new NotifyFreedSlotUseCase(repositories);
  }

  async execute({ bookingId, actor, result, note }) {
    if (!RESULT_LABEL[result]) throw AppError.badRequest('result must be "approved" or "rejected"');
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (!booking.isOutOfHours || booking.status !== 'pending' || booking.facultyApprovedAt) {
      throw AppError.badRequest('บันทึกผลคณบดีได้เฉพาะการจองนอกเวลาราชการที่ยังรอคณบดีอนุญาต');
    }
    const trimmedNote = note?.trim() || null;
    const when = `${formatDateDMY(booking.date)} · ${booking.time} · ${booking.title}`;
    const bookerIsApprover = result === 'approved'
      && await this.userRepository.canApproveAtLevel(booking.userId, 'department');

    const saved = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${Number(bookingId)} FOR UPDATE`;
      const current = await tx.booking.findUnique({ where: { id: Number(bookingId) }, select: { status: true, facultyApprovedAt: true } });
      if (current?.status !== 'pending' || current.facultyApprovedAt) {
        throw AppError.conflict('การจองนี้ถูกดำเนินการไปแล้ว กรุณารีเฟรชหน้า');
      }

      // The Staff "print the memo" card is done either way; when the Dean
      // refused, the booking is dead, so its facility card closes too.
      const deanCard = {
        status: RESULT_LABEL[result],
        statusBg: result === 'approved' ? '#dcfce7' : '#fee2e2',
        statusColor: result === 'approved' ? '#166534' : '#991b1b',
        unread: false, actions: [],
      };
      if (result === 'rejected') {
        await this.notificationRepository.closeStaffCardsForBooking(booking.id, deanCard, tx);
      } else {
        await this.notificationRepository.resolveNotificationsForAudience('staff', booking.id, deanCard, tx, 'booking');
      }

      let updated;
      if (result === 'rejected') {
        const reason = `คณบดีไม่อนุญาตให้ใช้ห้องนอกเวลาราชการ${trimmedNote ? ` (${trimmedNote})` : ''}`;
        updated = await this.bookingRepository.update(bookingId, { status: 'rejected', rejectReason: reason }, tx);
        await this.notificationRepository.addForUser(booking.userId, {
          iconKey: 'no', iconBg: '#fee2e2',
          title: `การจองห้อง ${booking.room} ไม่ได้รับอนุญาตจากคณบดี`,
          subtitle: `${when}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
          bookingId: booking.id, kind: 'booking',
        }, tx);
      } else if (bookerIsApprover) {
        updated = await this.bookingRepository.update(bookingId, {
          facultyApprovedBy: actor.id, facultyApprovedAt: new Date(),
          status: 'approved', approvedBy: booking.userId, approvedAt: new Date(),
        }, tx);
        await this.notificationRepository.addForUser(booking.userId, {
          iconKey: 'ok', iconBg: '#dcfce7',
          title: `คณบดีอนุญาตแล้ว การจองห้อง ${booking.room} ได้รับการอนุมัติ`,
          subtitle: `${when}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
          bookingId: booking.id, kind: 'booking',
        }, tx);
      } else {
        updated = await this.bookingRepository.update(bookingId, { facultyApprovedBy: actor.id, facultyApprovedAt: new Date() }, tx);
        await this.notificationRepository.addForUser(booking.userId, {
          iconKey: 'file', iconBg: '#EEF0FF',
          title: `คณบดีอนุญาตแล้ว การจองห้อง ${booking.room} รอหัวหน้าภาคอนุมัติ`,
          subtitle: `${when}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
          bookingId: booking.id, kind: 'booking',
        }, tx);
        await this.notificationRepository.addForAudience('approvers', {
          iconKey: 'cal', iconBg: '#FEF3C7',
          title: `${booking.user.split(' ')[0]} ขอจองห้อง ${booking.room} (นอกเวลาราชการ · คณบดีอนุญาตแล้ว)`,
          subtitle: `${formatDateDMY(booking.date)} · ${booking.time} · ${booking.title}`,
          status: 'รออนุมัติ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
          bookingId: booking.id, kind: 'booking',
        }, tx);
      }

      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.faculty_result', details: { bookingId: booking.id, result, note: trimmedNote } },
        tx,
      );
      return updated;
    });

    if (result === 'rejected') {
      await this.notifyFreedSlot.execute({ roomId: saved.roomId, date: saved.date, time: saved.time })
        .catch((err) => console.error('[facultyResult] freed-slot notice failed:', err));
    }
    return { success: true, booking: saved };
  }
}
