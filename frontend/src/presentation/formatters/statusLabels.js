import { formatDateTimeDMY } from '../../shared/dateFormat.js';
// Presentation-only label/color lookups for domain status values.
// Centralised here so every view/component shares one source of truth
// instead of each re-declaring its own copy (the old code had this map
// duplicated across dashboard.js, rooms.js, history.js and book.js).

export const BOOKING_STATUS_LABEL = { approved: 'อนุมัติ', pending: 'รอ', rejected: 'ปฏิเสธ', cancelled: 'ยกเลิก', expired: 'หมดอายุ', no_show: 'ไม่มาใช้ห้อง' };
export const BOOKING_STATUS_CHIP_CLASS = { approved: 'a', pending: 'p', rejected: 'r', cancelled: 'c', expired: 'c', no_show: 'r' };

export function bookingStatusLabel(status) {
  return BOOKING_STATUS_LABEL[status] || status;
}

export function bookingStatusChipHtml(status) {
  return `<span class="chip chip-${BOOKING_STATUS_CHIP_CLASS[status] || 'c'}">${bookingStatusLabel(status)}</span>`;
}

// The longer, conversational form used in confirmation/detail dialogs
// (e.g. "รอการอนุมัติ" rather than the short table-chip "รอ").
export const BOOKING_STATUS_LONG_LABEL = {
  approved: 'อนุมัติแล้ว', pending: 'รอการอนุมัติ',
  rejected: 'ปฏิเสธ', cancelled: 'ยกเลิก', expired: 'หมดอายุ', no_show: 'ไม่มาใช้ห้อง (คืนห้องแล้ว)',
};

export function bookingStatusLongLabel(status) {
  return BOOKING_STATUS_LONG_LABEL[status] || status;
}

export const ROOM_STATUS_META = {
  available: { label: 'พร้อมใช้งาน', color: '#166534', bg: '#dcfce7', dot: '#10b981' },
  occupied: { label: 'ไม่พร้อมใช้งาน', color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
  pending: { label: 'รอดำเนินการ', color: '#92400e', bg: '#FEF3C7', dot: '#f59e0b' },
};

export function roomStatusMeta(status) {
  return ROOM_STATUS_META[status] || ROOM_STATUS_META.available;
}

/** Formats an ISO timestamp (createdAt/submitted from the API) as
 * "DD/MM/YYYY(พ.ศ.) HH:MM", e.g. "03/08/2569 14:26". */
export function formatDateTime(iso) {
  return formatDateTimeDMY(iso);
}
