import { fromTimeValue } from '../infrastructure/repositories/BookingRepository.js';
import { broadcastChange } from '../realtime/liveEvents.js';
import { bookingMoment } from '../utils/bookingTime.js';

const CHECK_INTERVAL_MS = 2 * 60 * 1000;
const REMINDER_WINDOW_MS = 30 * 60 * 1000;

export async function tick({ bookingSettingRepository, bookingRepository, notificationRepository }) {
  const setting = await bookingSettingRepository.get();
  if (!setting.reminderBeforeBookingEnabled) return;

  const candidates = await bookingRepository.findUpcomingUnreminded();
  const now = Date.now();
  for (const booking of candidates) {
    // Thai wall-clock -> real moment (reading it as UTC once made every
    // reminder fire 7 hours late) — see utils/bookingTime.js.
    const startMs = bookingMoment(booking.bookingDate, booking.startTime).getTime();
    const diff = startMs - now;
    if (diff <= 0 || diff > REMINDER_WINDOW_MS) continue;

    await notificationRepository.addForUser(booking.userId, {
      iconKey: 'clock', iconBg: '#FEF3C7',
      title: `ใกล้ถึงเวลาใช้ห้อง ${booking.roomId}`,
      subtitle: `${booking.purpose} · เริ่ม ${fromTimeValue(booking.startTime)} น.${
        setting.checkInRequired && !booking.isOutOfHours
          ? ` · สแกน QR หน้าห้องเพื่อเช็กอินภายใน ${setting.checkInGraceMinutes} นาทีหลังเวลาเริ่ม ไม่เช่นนั้นระบบจะคืนห้อง`
          : ''}`,
      bookingId: booking.id, kind: 'booking',
    });
    await bookingRepository.markReminderSent(booking.id);
  }
}

/** Started once from index.js after the server boots; returns a stop function for graceful shutdown. */
export function startReminderJob(deps) {
  const id = setInterval(() => {
    tick(deps)
      .then(() => broadcastChange())
      .catch((err) => console.error('[reminderJob] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
