import { broadcastChange } from '../realtime/liveEvents.js';
// A date-boundary check, not a minute-precision one — checking a few
// times an hour is plenty to catch a booking's day rolling past.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

async function tick({ bookingRepository, notificationRepository }) {
  const candidates = await bookingRepository.findOverduePending();
  for (const { id } of candidates) {
    await bookingRepository.update(id, { status: 'expired' });
    // Clears the "รออนุมัติ"/อนุมัติ-ปฏิเสธ buttons on the stale card so
    // approvers can't act on a booking whose date already passed.
    await notificationRepository.resolveApproverNotifications(id, {
      status: 'หมดเวลา', statusBg: '#f3f4f6', statusColor: '#4b5563', unread: false, actions: [],
    });
  }
}

/** Started once from index.js after the server boots; returns a stop function for graceful shutdown. */
export function startExpireBookingsJob(deps) {
  const id = setInterval(() => {
    tick(deps)
      .then(() => broadcastChange('expireBookingsJob'))
      .catch((err) => console.error('[expireBookingsJob] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
