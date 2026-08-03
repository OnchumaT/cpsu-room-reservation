// Presentation-only label/color lookups for domain status values.
// Centralised here so every view/component shares one source of truth
// instead of each re-declaring its own copy (the old code had this map
// duplicated across dashboard.js, rooms.js, history.js and book.js).

export const BOOKING_STATUS_LABEL = { approved: 'อนุมัติ', pending: 'รอ', rejected: 'ปฏิเสธ', cancelled: 'ยกเลิก' };
export const BOOKING_STATUS_CHIP_CLASS = { approved: 'a', pending: 'p', rejected: 'r', cancelled: 'c' };

export function bookingStatusLabel(status) {
  return BOOKING_STATUS_LABEL[status] || status;
}

export function bookingStatusChipHtml(status) {
  return `<span class="chip chip-${BOOKING_STATUS_CHIP_CLASS[status] || 'c'}">${bookingStatusLabel(status)}</span>`;
}

// The longer, conversational form used in confirmation/detail dialogs
// (e.g. "รอการอนุมัติ" rather than the short table-chip "รอ").
export const BOOKING_STATUS_LONG_LABEL = { approved: 'อนุมัติแล้ว', pending: 'รอการอนุมัติ', rejected: 'ปฏิเสธ', cancelled: 'ยกเลิก' };

export function bookingStatusLongLabel(status) {
  return BOOKING_STATUS_LONG_LABEL[status] || status;
}

export const ROOM_STATUS_META = {
  available: { label: 'ว่าง', color: '#166534', bg: '#dcfce7', dot: '#10b981' },
  occupied: { label: 'ไม่ว่าง', color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
  pending: { label: 'รอดำเนินการ', color: '#92400e', bg: '#FEF3C7', dot: '#f59e0b' },
};

export function roomStatusMeta(status) {
  return ROOM_STATUS_META[status] || ROOM_STATUS_META.available;
}

/** Formats an ISO timestamp (createdAt/submitted from the API) into a
 * short, readable Thai date/time string, e.g. "3 ส.ค. 14:26". */
export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
