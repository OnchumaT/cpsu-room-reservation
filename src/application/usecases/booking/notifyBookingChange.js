import { Notification } from '../../../domain/entities/Notification.js';

const EVENT_META = {
  edited: { icKey: 'cal', ibg: '#EEF0FF', verb: 'แก้ไขการจอง', st: 'แก้ไขแล้ว', stBg: '#EEF0FF', stC: '#38419D' },
  cancelled: { icKey: 'no', ibg: '#F4F5FA', verb: 'ยกเลิกการจอง', st: 'ยกเลิกแล้ว', stBg: '#F4F5FA', stC: '#4A4F7A' },
};

/**
 * Whenever a booking is edited or cancelled, both Head and Staff get an
 * FYI notification — even the one of them who performed the action, so
 * both stay in sync on bookings either side didn't touch themselves.
 * Shared by EditBookingUseCase and CancelBookingUseCase.
 */
export function notifyBookingChange({ notificationRepository, booking, event }) {
  const meta = EVENT_META[event];
  const base = {
    unr: true,
    icKey: meta.icKey,
    ibg: meta.ibg,
    title: `${booking.user} ${meta.verb} ${booking.id}`,
    sub: `ห้อง ${booking.room} · ${booking.date} · ${booking.time}`,
    time: 'เมื่อสักครู่',
    st: meta.st,
    stBg: meta.stBg,
    stC: meta.stC,
    acts: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
    bookingId: booking.id,
  };
  const baseId = Date.now();
  notificationRepository.addHeadNotification(new Notification({ id: baseId, ...base }));
  notificationRepository.addStaffNotification(new Notification({ id: baseId + 1, ...base }));
}
