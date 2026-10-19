import { fromTimeValue } from '../infrastructure/repositories/BookingRepository.js';
import { broadcastChange } from '../realtime/liveEvents.js';

const CHECK_INTERVAL_MS = 2 * 60 * 1000;
const REMINDER_WINDOW_MS = 30 * 60 * 1000;

// Booking dates and times are Thai wall-clock values (a "16:30" booking means
// 16:30 in Bangkok). Thailand is UTC+7 all year (no daylight saving).
const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

// bookingDate (UTC midnight of that date) + startTime (UTC-1970-anchored
// time-of-day) -> the real moment the booking starts. The UTC getters read
// back the stored calendar date and wall-clock time; reading them as UTC
// alone made every reminder fire 7 hours late (after the booking had ended),
// so the Bangkok offset is taken off. Independent of the server's own timezone.
function combineDateAndTime(bookingDate, startTime) {
  return new Date(Date.UTC(
    bookingDate.getUTCFullYear(), bookingDate.getUTCMonth(), bookingDate.getUTCDate(),
    startTime.getUTCHours(), startTime.getUTCMinutes(), startTime.getUTCSeconds(),
  ) - BANGKOK_UTC_OFFSET_MS);
}

export async function tick({ bookingSettingRepository, bookingRepository, notificationRepository }) {
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
    tick(deps)
      .then(() => broadcastChange('reminderJob'))
      .catch((err) => console.error('[reminderJob] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
