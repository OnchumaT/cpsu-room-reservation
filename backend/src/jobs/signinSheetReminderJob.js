import { fromTimeValue } from '../infrastructure/repositories/BookingRepository.js';
import { thaiTodayStart } from '../utils/bookingTime.js';
import { formatDateDMY } from '../utils/dateFormat.js';
import { broadcastChange } from '../realtime/liveEvents.js';

// After a catered event booked for students, the attendee sign-in sheet
// (form page 2) must come back to Staff to claim the catering cost. Once
// the day has passed without it, the teacher who booked is reminded once.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export async function tick({ bookingRepository, notificationRepository }, now = new Date()) {
  const rows = await bookingRepository.findSigninSheetOutstanding(thaiTodayStart(now));
  const due = rows.filter((b) => (b.food || []).length > 0 && (b.bookingForStudents || []).length > 0);
  for (const b of due) {
    await notificationRepository.addForUser(b.userId, {
      iconKey: 'file', iconBg: '#FEF3C7',
      title: `ยังไม่ได้ส่งใบลงชื่อผู้เข้าร่วม — ห้อง ${b.roomId}`,
      subtitle: `${formatDateDMY(b.bookingDate.toISOString())} · ${fromTimeValue(b.startTime)}-${fromTimeValue(b.endTime)} · ${b.purpose} · โปรดส่งใบลงชื่อที่รับรองแล้วให้เจ้าหน้าที่ เพื่อใช้เบิกค่าอาหาร`,
      bookingId: b.id, kind: 'booking',
    });
    await bookingRepository.markSigninSheetReminded(b.id);
  }
}

/** Started once from index.js after the server boots; returns a stop function for graceful shutdown. */
export function startSigninSheetReminderJob(deps) {
  const id = setInterval(() => {
    tick(deps)
      .then(() => broadcastChange())
      .catch((err) => console.error('[signinSheetReminderJob] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
