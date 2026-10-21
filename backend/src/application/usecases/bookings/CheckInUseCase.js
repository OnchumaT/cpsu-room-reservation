import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { bookingMoment, thaiTodayStart } from '../../../utils/bookingTime.js';
import { formatDateDMY } from '../../../utils/dateFormat.js';
import { toTimeValue } from '../../../infrastructure/repositories/BookingRepository.js';

// Check-in opens this long before the start, so arriving a little early works.
export const CHECK_IN_OPENS_BEFORE_MS = 15 * 60 * 1000;

/**
 * QR check-in at the room door. The QR code carries the room's secret token
 * (RoomRepository.getCheckInToken), so a valid check-in means the person was
 * standing at that room. A booking nobody checks into within the grace
 * period is released by jobs/noShowJob.js.
 */
export class CheckInUseCase {
  constructor({ bookingRepository, roomRepository, auditLogRepository, notificationRepository, bookingSettingRepository }) {
    this.bookingRepository = bookingRepository;
    this.roomRepository = roomRepository;
    this.auditLogRepository = auditLogRepository;
    this.notificationRepository = notificationRepository;
    this.bookingSettingRepository = bookingSettingRepository;
  }

  /** The booker scans the room's QR code — checks in their own booking running in that room now. */
  async byQr({ actor, roomId, token }) {
    if (!roomId || !(await this.roomRepository.checkInTokenMatches(roomId, token))) {
      throw AppError.badRequest('QR Code ไม่ถูกต้อง กรุณาสแกนจากป้ายหน้าห้องอีกครั้ง');
    }
    const now = new Date();
    const todays = await this.bookingRepository.findTodayForCheckIn({ userId: actor.id, roomId, todayStart: thaiTodayStart(now) });
    const withTimes = todays.map((b) => ({ b, start: bookingMoment(b.bookingDate, b.startTime), end: bookingMoment(b.bookingDate, b.endTime) }));
    const current = withTimes.find(({ start, end }) => now >= start - CHECK_IN_OPENS_BEFORE_MS && now < end);

    if (!current) {
      const next = withTimes.find(({ start }) => now < start - CHECK_IN_OPENS_BEFORE_MS);
      if (next) throw AppError.badRequest(`ยังไม่ถึงเวลาเช็กอิน — เช็กอินได้ตั้งแต่ 15 นาทีก่อนเวลาเริ่ม`, { opensAt: new Date(next.start - CHECK_IN_OPENS_BEFORE_MS) });
      throw AppError.notFound('ไม่พบการจองของคุณที่ห้องนี้ในช่วงเวลานี้');
    }
    if (current.b.status === 'no_show') {
      throw AppError.conflict('การจองนี้ถูกคืนห้องแล้ว เพราะไม่ได้เช็กอินภายในเวลาที่กำหนด');
    }
    return this._checkIn(current.b.id, actor, 'qr');
  }

  /** Staff checks in on the booker's behalf (e.g. a teacher whose phone is dead, or students booked by a teacher). */
  async onBehalf({ actor, bookingId }) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.status !== 'approved') throw AppError.badRequest('เช็กอินได้เฉพาะการจองที่อนุมัติแล้ว');
    // Same deadline the no-show job uses: once the grace period after the
    // start has run out (when check-in is required), it's too late — the
    // booking is about to be released, not checked in.
    const setting = await this.bookingSettingRepository.get();
    const [start, end] = booking.time.split('-');
    const date = new Date(booking.date);
    const deadline = setting.checkInRequired
      ? bookingMoment(date, toTimeValue(start)).getTime() + setting.checkInGraceMinutes * 60 * 1000
      : bookingMoment(date, toTimeValue(end)).getTime();
    if (Date.now() >= deadline) throw AppError.badRequest('เลยเวลาเช็กอินแล้ว');
    return this._checkIn(booking.id, actor, 'staff');
  }

  async _checkIn(bookingId, actor, method) {
    return prisma.$transaction(async (tx) => {
      // Guarded write: never overwrite an earlier check-in, never revive a released booking.
      const { count } = await tx.booking.updateMany({
        where: { id: Number(bookingId), status: 'approved', checkedInAt: null },
        data: { checkedInAt: new Date() },
      });
      const booking = await this.bookingRepository.findById(bookingId, tx);
      if (!count) {
        if (booking?.checkedInAt) return { success: true, alreadyCheckedIn: true, booking };
        throw AppError.conflict('การจองนี้ไม่อยู่ในสถานะที่เช็กอินได้แล้ว');
      }
      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.check_in', details: { bookingId: Number(bookingId), method } },
        tx,
      );
      // Staff see who is in which room; a check-in done for the booker tells them too.
      const when = `${formatDateDMY(booking.date)} · ${booking.time} · ${booking.title}`;
      await this.notificationRepository.addForAudience('staff', {
        iconKey: 'ok', iconBg: '#dcfce7',
        title: method === 'staff'
          ? `${actor.name} เช็กอินห้อง ${booking.room} แทน ${booking.user}`
          : `${booking.user} เช็กอินห้อง ${booking.room} แล้ว`,
        subtitle: when,
        status: 'เช็กอินแล้ว', statusBg: '#dcfce7', statusColor: '#166534',
        bookingId: booking.id, kind: 'booking',
      }, tx);
      if (method === 'staff') {
        await this.notificationRepository.addForUser(booking.userId, {
          iconKey: 'ok', iconBg: '#dcfce7',
          title: `เจ้าหน้าที่เช็กอินห้อง ${booking.room} ให้คุณแล้ว`,
          subtitle: when, bookingId: booking.id, kind: 'booking',
        }, tx);
      }
      return { success: true, alreadyCheckedIn: false, booking };
    });
  }
}
