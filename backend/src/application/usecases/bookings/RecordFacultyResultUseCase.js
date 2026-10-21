import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateDMY } from '../../../utils/dateFormat.js';
import { NotifyFreedSlotUseCase } from './NotifyFreedSlotUseCase.js';

const RESULT_LABEL = {
  approved: 'คณบดีอนุญาต',
  rejected: 'คณบดีไม่อนุญาต',
};

/**
 * Out-of-hours bookings need the Dean's permission BEFORE they count — the
 * Dean's answer settles them, with no further department approval step.
 * The Dean doesn't use the system: Staff prints the memo (signed by the head
 * of department, printFacultyMemo.js) and records the Dean's answer here.
 *
 * - permitted → approved straight away, for every booker.
 * - refused → rejected, the slot is freed.
 * While it waits, an approver may still reject it from the queue.
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
      } else {
        // The Dean's permission is the final word: the booking is approved
        // now, for every booker. The memo to the Dean was already signed by
        // the head of department, and approvers could reject it while it
        // waited. approved_by is the booker for a head's own booking, else
        // empty — the Staff member who recorded it is faculty_approved_by.
        updated = await this.bookingRepository.update(bookingId, {
          facultyApprovedBy: actor.id, facultyApprovedAt: new Date(),
          status: 'approved', approvedBy: bookerIsApprover ? booking.userId : null, approvedAt: new Date(),
        }, tx);
        await this.notificationRepository.addForUser(booking.userId, {
          iconKey: 'ok', iconBg: '#dcfce7',
          title: `คณบดีอนุญาตแล้ว การจองห้อง ${booking.room} ได้รับการอนุมัติ`,
          subtitle: `${when}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
          bookingId: booking.id, kind: 'booking',
        }, tx);
      }
      // Approvers' "waiting for the Dean" card gets the outcome.
      await this.notificationRepository.resolveApproverNotifications(booking.id, {
        status: result === 'approved' ? 'อนุมัติแล้ว (คณบดีอนุญาต)' : 'คณบดีไม่อนุญาต',
        statusBg: deanCard.statusBg, statusColor: deanCard.statusColor, unread: false, actions: [],
      }, tx);

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
