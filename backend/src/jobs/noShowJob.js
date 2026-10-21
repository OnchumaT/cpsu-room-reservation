import { prisma } from '../lib/prisma.js';
import { broadcastChange } from '../realtime/liveEvents.js';
import { bookingMoment, thaiTodayStart } from '../utils/bookingTime.js';
import { fromTimeValue } from '../infrastructure/repositories/BookingRepository.js';
import { formatDateDMY } from '../utils/dateFormat.js';
import { NotifyFreedSlotUseCase } from '../application/usecases/bookings/NotifyFreedSlotUseCase.js';

// Same cadence as the 30-minutes-before reminder — releasing within a couple
// of minutes of the grace period ending is plenty.
const CHECK_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Releases today's approved bookings nobody checked into (QR at the door)
 * within the grace period after the start: status -> no_show, the booker is
 * told, Staff cards about it close, and anyone who wanted the slot hears it
 * is free. Only while the booking is still running — once it has ended,
 * releasing it frees nothing (and covers the moment the feature is switched
 * on mid-day without flagging bookings that never had the chance to check in).
 */
export async function tick(repositories) {
  const { bookingSettingRepository, bookingRepository, notificationRepository, auditLogRepository } = repositories;
  const setting = await bookingSettingRepository.get();
  if (!setting.checkInRequired) return 0;

  const now = new Date();
  const graceMs = setting.checkInGraceMinutes * 60 * 1000;
  const candidates = await bookingRepository.findAwaitingCheckIn(thaiTodayStart(now));
  const notifyFreedSlot = new NotifyFreedSlotUseCase(repositories);
  let released = 0;

  for (const b of candidates) {
    const start = bookingMoment(b.bookingDate, b.startTime);
    const end = bookingMoment(b.bookingDate, b.endTime);
    if (now < start.getTime() + graceMs || now >= end) continue;

    const time = `${fromTimeValue(b.startTime)}-${fromTimeValue(b.endTime)}`;
    const date = b.bookingDate.toISOString().slice(0, 10);
    const done = await prisma.$transaction(async (tx) => {
      // Guarded: a check-in that lands at the same moment wins.
      const { count } = await tx.booking.updateMany({
        where: { id: b.id, status: 'approved', checkedInAt: null },
        data: { status: 'no_show' },
      });
      if (!count) return false;
      await notificationRepository.addForUser(b.userId, {
        iconKey: 'no', iconBg: '#fee2e2',
        title: `คืนห้อง ${b.roomId} แล้ว เนื่องจากไม่ได้เช็กอิน`,
        subtitle: `${formatDateDMY(date)} · ${time} · ${b.purpose} · ไม่ได้สแกน QR เช็กอินภายใน ${setting.checkInGraceMinutes} นาทีหลังเวลาเริ่ม`,
        bookingId: b.id, kind: 'booking',
      }, tx);
      await notificationRepository.closeStaffCardsForBooking(b.id, {
        status: 'ไม่มาใช้ห้อง', statusBg: '#fee2e2', statusColor: '#991b1b', unread: false,
      }, tx);
      await auditLogRepository.create({ userId: null, action: 'booking.no_show', details: { bookingId: b.id } }, tx);
      return true;
    });
    if (!done) continue;
    released += 1;
    await notifyFreedSlot.execute({ roomId: b.roomId, date, time })
      .catch((err) => console.error('[noShowJob] freed-slot notice failed:', err));
  }
  return released;
}

/** Started once from index.js after the server boots; returns a stop function for graceful shutdown. */
export function startNoShowJob(repositories) {
  const id = setInterval(() => {
    tick(repositories)
      .then(() => broadcastChange())
      .catch((err) => console.error('[noShowJob] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
