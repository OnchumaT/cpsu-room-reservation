import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateSpan } from '../../../utils/dateFormat.js';
import { NotifyFreedSlotUseCase } from './NotifyFreedSlotUseCase.js';

const awaitsDean = (b) => b.isOutOfHours && b.status === 'pending' && !b.facultyApprovedAt;

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
    if (!awaitsDean(booking)) {
      throw AppError.badRequest('บันทึกผลคณบดีได้เฉพาะการจองนอกเวลาราชการที่ยังรอคณบดีอนุญาต');
    }
    // One memo covers every out-of-hours day of a multi-day booking, so the
    // Dean's answer is recorded for all of them at once. In-hours days of the
    // same booking don't need the Dean and are left as they are.
    const targets = booking.groupId
      ? (await this.bookingRepository.findGroup(booking.groupId)).filter(awaitsDean)
      : [booking];
    const trimmedNote = note?.trim() || null;
    const span = formatDateSpan(targets.map((b) => b.date));
    const when = `${span} · ${booking.time} · ${booking.title}`;
    const bookerIsApprover = result === 'approved'
      && await this.userRepository.canApproveAtLevel(booking.userId, 'department');

    const saved = await prisma.$transaction(async (tx) => {
      const locked = [];
      for (const target of targets) {
        await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${Number(target.id)} FOR UPDATE`;
        const current = await tx.booking.findUnique({ where: { id: Number(target.id) }, select: { status: true, facultyApprovedAt: true } });
        if (current?.status === 'pending' && !current.facultyApprovedAt) locked.push(target);
      }
      if (!locked.length) {
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
      const updated = [];
      for (const target of locked) {
        if (result === 'rejected') {
          await this.notificationRepository.closeStaffCardsForBooking(target.id, deanCard, tx);
          const reason = `คณบดีไม่อนุญาตให้ใช้ห้องนอกเวลาราชการ${trimmedNote ? ` (${trimmedNote})` : ''}`;
          updated.push(await this.bookingRepository.update(target.id, { status: 'rejected', rejectReason: reason }, tx));
        } else {
          await this.notificationRepository.resolveNotificationsForAudience('staff', target.id, deanCard, tx, 'booking');
          updated.push(await this.bookingRepository.update(target.id, {
            facultyApprovedBy: actor.id, facultyApprovedAt: new Date(),
            ...(bookerIsApprover ? { status: 'approved', approvedBy: booking.userId, approvedAt: new Date() } : {}),
          }, tx));
        }
      }
      const first = updated[0];

      if (result === 'rejected') {
        await this.notificationRepository.addForUser(booking.userId, {
          iconKey: 'no', iconBg: '#fee2e2',
          title: `การจองห้อง ${booking.room} ไม่ได้รับอนุญาตจากคณบดี`,
          subtitle: `${when}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
          bookingId: first.id, kind: 'booking',
        }, tx);
      } else if (bookerIsApprover) {
        await this.notificationRepository.addForUser(booking.userId, {
          iconKey: 'ok', iconBg: '#dcfce7',
          title: `คณบดีอนุญาตแล้ว การจองห้อง ${booking.room} ได้รับการอนุมัติ`,
          subtitle: `${when}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
          bookingId: first.id, kind: 'booking',
        }, tx);
      } else {
        await this.notificationRepository.addForUser(booking.userId, {
          iconKey: 'file', iconBg: '#EEF0FF',
          title: `คณบดีอนุญาตแล้ว การจองห้อง ${booking.room} รอหัวหน้าภาคอนุมัติ`,
          subtitle: `${when}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
          bookingId: first.id, kind: 'booking',
        }, tx);
        await this.notificationRepository.addForAudience('approvers', {
          iconKey: 'cal', iconBg: '#FEF3C7',
          title: `${booking.user.split(' ')[0]} ขอจองห้อง ${booking.room} (นอกเวลาราชการ · คณบดีอนุญาตแล้ว)`,
          subtitle: `${span} · ${booking.time} · ${booking.title}`,
          status: 'รออนุมัติ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
          bookingId: first.id, kind: 'booking',
        }, tx);
      }

      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.faculty_result', details: { bookingId: booking.id, result, note: trimmedNote, ...(updated.length > 1 ? { bookingIds: updated.map((b) => b.id) } : {}) } },
        tx,
      );
      return updated;
    });

    if (result === 'rejected') {
      for (const b of saved) {
        await this.notifyFreedSlot.execute({ roomId: b.roomId, date: b.date, time: b.time })
          .catch((err) => console.error('[facultyResult] freed-slot notice failed:', err));
      }
    }
    return { success: true, booking: saved.find((b) => b.id === booking.id) || saved[0], bookings: saved };
  }
}
