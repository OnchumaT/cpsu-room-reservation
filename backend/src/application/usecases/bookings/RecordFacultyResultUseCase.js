import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateDMY } from '../../../utils/dateFormat.js';

const RESULT_LABEL = {
  approved: 'คณบดีรับทราบและอนุมัติ',
  rejected: 'คณบดีไม่อนุมัติ',
};

/** Staff records the outcome of the memo to the Dean for an approved out-of-hours booking, and tells the requester. */
export class RecordFacultyResultUseCase {
  constructor({ bookingRepository, notificationRepository, auditLogRepository }) {
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
  }

  async execute({ bookingId, actor, result, note }) {
    if (!RESULT_LABEL[result]) throw AppError.badRequest('result must be "approved" or "rejected"');
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (!booking.isOutOfHours || booking.status !== 'approved') {
      throw AppError.badRequest('บันทึกผลได้เฉพาะการจองนอกเวลาทำการที่อนุมัติแล้ว');
    }
    const trimmedNote = note?.trim() || null;

    await prisma.$transaction(async (tx) => {
      await this.notificationRepository.addForUser(booking.userId, {
        iconKey: 'file', iconBg: '#EEF0FF',
        title: `ผลการแจ้งคณบดี การจองห้อง ${booking.room}: ${RESULT_LABEL[result]}`,
        subtitle: `${formatDateDMY(booking.date)} · ${booking.time}${trimmedNote ? ` · ${trimmedNote}` : ''}`,
        bookingId: booking.id, kind: 'booking',
      }, tx);
      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.faculty_result', details: { bookingId: booking.id, result, note: trimmedNote } },
        tx,
      );
    });

    return { success: true, booking };
  }
}
