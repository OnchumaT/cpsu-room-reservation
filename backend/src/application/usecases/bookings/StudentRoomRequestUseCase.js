import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateDMY, formatDateSpan } from '../../../utils/dateFormat.js';

const ACTIVE = ['pending', 'approved'];
const hasStudents = (b) => (b.bookingForStudents || []).length > 0;
export const isCatered = (b) => (b.food || []).length > 0;

/**
 * Staff's part of the department's paper room-request form for students
 * (printStudentRoomRequest.js), done in the system:
 *  - recordStaffCheck — the "ผู้ตรวจสอบ" step: who looks after the catering
 *    and who opens/closes the room, for every day of the booking;
 *  - setSigninSheet — the attendee sign-in sheet (form page 2) came back
 *    after a catered event (it is needed to claim the catering cost).
 */
export class StudentRoomRequestUseCase {
  constructor({ bookingRepository, notificationRepository, auditLogRepository }) {
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
  }

  async _requireStudentBooking(bookingId) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (!hasStudents(booking)) throw AppError.badRequest('ใช้ได้เฉพาะการจองแทนนักศึกษา');
    return booking;
  }

  async recordStaffCheck({ bookingId, actor, cateringAssignee, openerAssignee }) {
    const booking = await this._requireStudentBooking(bookingId);
    if (!ACTIVE.includes(booking.status)) throw AppError.badRequest(`Booking is already ${booking.status}`);
    const catering = cateringAssignee?.trim() || null;
    const opener = openerAssignee?.trim() || null;
    if (isCatered(booking) && !catering) throw AppError.badRequest('กรุณาระบุผู้ดูแลการจัดเลี้ยง');
    if (!opener) throw AppError.badRequest('กรุณาระบุผู้ดูแลการเปิด-ปิดห้อง');

    const days = booking.groupId
      ? (await this.bookingRepository.findGroup(booking.groupId)).filter((b) => ACTIVE.includes(b.status))
      : [booking];
    const saved = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const day of days) {
        out.push(await this.bookingRepository.update(day.id, {
          cateringAssignee: catering, openerAssignee: opener, checkedByName: actor.name, checkedAt: new Date(),
        }, tx));
      }
      await this.notificationRepository.addForUser(booking.userId, {
        iconKey: 'ok', iconBg: '#EEF0FF',
        title: `เจ้าหน้าที่ตรวจสอบคำร้องใช้ห้อง ${booking.room} แล้ว`,
        subtitle: `${formatDateSpan(days.map((d) => d.date))} · ${booking.time}`
          + `${catering ? ` · ผู้ดูแลจัดเลี้ยง: ${catering}` : ''} · ผู้ดูแลเปิด-ปิดห้อง: ${opener}`,
        bookingId: booking.id, kind: 'booking',
      }, tx);
      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.staff_check', details: { bookingId: booking.id, bookingIds: days.map((d) => d.id), cateringAssignee: catering, openerAssignee: opener } },
        tx,
      );
      return out;
    });
    return { success: true, booking: saved.find((b) => b.id === booking.id) || saved[0] };
  }

  async setSigninSheet({ bookingId, actor, received }) {
    const booking = await this._requireStudentBooking(bookingId);
    if (!isCatered(booking)) throw AppError.badRequest('ใช้เฉพาะการจองที่มีการจัดเลี้ยง');
    const saved = await prisma.$transaction(async (tx) => {
      const updated = await this.bookingRepository.update(booking.id, received
        ? { signinSheetReceivedAt: new Date(), signinSheetReceivedByName: actor.name }
        : { signinSheetReceivedAt: null, signinSheetReceivedByName: null }, tx);
      await this.auditLogRepository.create(
        { userId: actor.id, action: received ? 'booking.signin_sheet_received' : 'booking.signin_sheet_unreceived', details: { bookingId: booking.id, date: formatDateDMY(booking.date) } },
        tx,
      );
      return updated;
    });
    return { success: true, booking: saved };
  }
}
