// Pure, no I/O — whether a booking counts as "out of hours" (นอกเวลาราชการ).
// Out-of-hours bookings are accepted but always need department (head/vice-head)
// approval before they take effect (see CreateBookingUseCase).
//
// Normal hours: Monday–Friday, and the whole booking (start AND end) inside
// 08:30–16:30. Anything else — any part outside that window, a Saturday,
// a Sunday, or a holiday — is out of hours. `start`/`end` are "HH:MM"
// (zero-padded 24h), so plain string comparison is safe. `date` is "YYYY-MM-DD".
const OFFICE_HOURS_START = '08:30';
const OFFICE_HOURS_END = '16:30';

// .getUTCDay() (not .getDay()) — a date-only 'YYYY-MM-DD' string is always
// parsed as UTC midnight, and reading it back as the *calendar* day of
// week (not converted to server-local time first) is what we actually
// want here, regardless of what timezone this process happens to run in.
function isWeekend(dateStr) {
  const day = new Date(dateStr).getUTCDay();
  return day === 0 || day === 6; // Sunday, Saturday
}

export function isOutOfHours({ date, start, end, isHoliday }) {
  if (isWeekend(date) || Boolean(isHoliday)) return true;
  return start < OFFICE_HOURS_START || end > OFFICE_HOURS_END;
}
