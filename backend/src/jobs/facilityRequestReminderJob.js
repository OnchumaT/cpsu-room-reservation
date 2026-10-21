import { fromTimeValue } from '../infrastructure/repositories/BookingRepository.js';
import { formatDateDMY } from '../utils/dateFormat.js';
import { broadcastChange } from '../realtime/liveEvents.js';

// A day-before nudge doesn't need the 30-min job's minute-level precision —
// checking a few times an hour is plenty to catch "tomorrow" as it rolls in.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export async function tick({ facilityRequestRepository, notificationRepository }) {
  const candidates = await facilityRequestRepository.findApproachingUnreminded();
  for (const fr of candidates) {
    const { booking } = fr;
    await notificationRepository.addForAudience('staff', {
      iconKey: 'clock', iconBg: '#FEF3C7',
      title: booking.status === 'pending'
        ? 'พรุ่งนี้มีการจองที่ยังไม่ได้เตรียมสิ่งอำนวยความสะดวก (การจองยังรออนุมัติ)'
        : 'พรุ่งนี้มีการจองที่ยังไม่ได้เตรียมสิ่งอำนวยความสะดวก',
      subtitle: `${booking.user?.name ?? ''} · ห้อง ${booking.roomId} · ${formatDateDMY(booking.bookingDate.toISOString())} · ${fromTimeValue(booking.startTime)}-${fromTimeValue(booking.endTime)}`,
      status: 'รอ', statusBg: '#FEF3C7', statusColor: '#92400e',
      actions: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
      bookingId: booking.id, kind: 'facility-request',
    });
    await facilityRequestRepository.markStaffReminderSent(fr.id);
  }
}

/** Started once from index.js after the server boots; returns a stop function for graceful shutdown. */
export function startFacilityRequestReminderJob(deps) {
  const id = setInterval(() => {
    tick(deps)
      .then(() => broadcastChange())
      .catch((err) => console.error('[facilityRequestReminderJob] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
