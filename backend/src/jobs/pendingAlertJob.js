import { fromTimeValue } from '../infrastructure/repositories/BookingRepository.js';
import { bookingMoment, thaiTodayStart } from '../utils/bookingTime.js';
import { formatDateDMY } from '../utils/dateFormat.js';
import { broadcastChange } from '../realtime/liveEvents.js';

// A booking still pending this close to its start is flagged to Staff, who
// can chase the head/vice-head (or the Dean, for out-of-hours) in person.
export const PENDING_ALERT_HOURS = 24;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

function hoursLeftText(ms) {
  const hours = Math.floor(ms / 3600000);
  return hours >= 1 ? `อีกประมาณ ${hours} ชั่วโมง` : `อีก ${Math.max(1, Math.round(ms / 60000))} นาที`;
}

export async function tick({ bookingRepository, notificationRepository, userRepository }, now = new Date()) {
  const candidates = await bookingRepository.findPendingUnalerted(thaiTodayStart(now));
  const dueSoon = candidates
    .map((b) => ({ b, msLeft: bookingMoment(b.bookingDate, b.startTime) - now }))
    .filter(({ msLeft }) => msLeft > 0 && msLeft <= PENDING_ALERT_HOURS * 3600000);
  if (!dueSoon.length) return;

  const approvers = await userRepository.getApprovers({ level: 'department' });
  const approverNames = approvers.map((u) => u.name).join(', ') || 'ยังไม่มีผู้ดำรงตำแหน่ง';
  for (const { b, msLeft } of dueSoon) {
    const awaitingDean = b.isOutOfHours && !b.facultyApprovedAt;
    await notificationRepository.addForAudience('staff', {
      iconKey: 'clock', iconBg: '#fee2e2',
      title: awaitingDean
        ? `ใกล้ถึงเวลาใช้ห้อง ${b.roomId} แล้ว แต่ยังไม่ได้บันทึกผลคณบดี`
        : `ใกล้ถึงเวลาใช้ห้อง ${b.roomId} แล้ว แต่หัวหน้า/รองหัวหน้ายังไม่อนุมัติ`,
      subtitle: `${b.user?.name ?? ''} · ${formatDateDMY(b.bookingDate.toISOString())} · ${fromTimeValue(b.startTime)}-${fromTimeValue(b.endTime)} · ${b.purpose} · เริ่ม${hoursLeftText(msLeft)}`
        + (awaitingDean ? ' · โปรดติดต่อคณบดีแล้วบันทึกผล' : ` · โปรดติดตามผู้อนุมัติ: ${approverNames}`),
      status: awaitingDean ? 'รอคณบดี' : 'รออนุมัติ', statusBg: '#fee2e2', statusColor: '#991b1b',
      actions: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
      bookingId: b.id, kind: 'booking',
    });
    await bookingRepository.markPendingAlertSent(b.id);
  }
}

/** Started once from index.js after the server boots; returns a stop function for graceful shutdown. */
export function startPendingAlertJob(deps) {
  const run = () => tick(deps)
    .then(() => broadcastChange())
    .catch((err) => console.error('[pendingAlertJob] tick failed:', err));
  const id = setInterval(run, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
