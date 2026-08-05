import { bookingStatusLabel, BOOKING_STATUS_CHIP_CLASS } from '../formatters/statusLabels.js';

/** Replaces bookingStatusChipHtml()'s HTML-string return with a real
 * component. */
export function StatusChip({ status }) {
  return <span className={`chip chip-${BOOKING_STATUS_CHIP_CLASS[status] || 'c'}`}>{bookingStatusLabel(status)}</span>;
}
