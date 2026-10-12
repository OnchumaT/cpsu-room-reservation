import { fromTimeValue } from '../infrastructure/repositories/BookingRepository.js';

const CHECK_INTERVAL_MS = 2 * 60 * 1000;
const REMINDER_WINDOW_MS = 30 * 60 * 1000;

// bookingDate (UTC midnight of that date) + startTime (UTC-1970-anchored
// time-of-day) -> a real timestamp, the same UTC-getter approach the rest
// of this codebase uses to avoid local-timezone Date coercion bugs (see
// BookingRepository.findConflict's comment on the same pitfall).
function combineDateAndTime(bookingDate, startTime) {
  return new Date(Date.UTC(
    bookingDate.getUTCFullYear(), bookingDate.getUTCMonth(), bookingDate.getUTCDate(),
    startTime.getUTCHours(), startTime.getUTCMinutes(), startTime.getUTCSeconds(),
  ));
}

async function tick({ bookingSettingRepository, bookingRepository, notificationRepository }) {
  const setting = await bookingSettingRepository.get();
  if (!setting.reminderBeforeBookingEnabled) return;

  const candidates = await bookingRepository.findUpcomingUnreminded();
  const now = Date.now();
  for (const booking of candidates) {
    const startMs = combineDateAndTime(booking.bookingDate, booking.startTime).getTime();
    const diff = startMs - now;
    if (diff <= 0 || diff > REMINDER_WINDOW_MS) continue;

    await notificationRepository.addForUser(booking.userId, {
      iconKey: 'clock', iconBg: '#FEF3C7',
      title: `ใกล้ถึงเวลาใช้ห้อง ${booking.roomId}`,
      subtitle: `${booking.purpose} · เริ่ม ${fromTimeValue(booking.startTime)} น.`,
      bookingId: booking.id, kind: 'booking',
    });
    await bookingRepository.markReminderSent(booking.id);
  }
}

/** Started once from index.js after the server boots; returns a stop function for graceful shutdown. */
export function startReminderJob(deps) {
  const id = setInterval(() => {
    tick(deps).catch((err) => console.error('[reminderJob] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
