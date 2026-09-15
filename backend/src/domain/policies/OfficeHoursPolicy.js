// Pure, no I/O — whether a booking counts as "out of hours" (นอกเวลาราชการ).
// Bookings are never blocked by this; it only decides whether the 2-stage
// faculty/dean approval flow applies (see ApproveRejectBookingUseCase).
//
// Rule (matches the standard Thai civil-service definition of นอกเวลาราชการ):
// a booking is out-of-hours, for the whole day, if its date is a Saturday,
// a Sunday, or a holiday (annual or a special ครม.-announced one — looked
// up via HolidayRepository, e.g. Songkran, New Year, a royal birthday).
// Otherwise (a weekday, not a holiday) it's out-of-hours only if its start
// time falls outside the 08:30–18:00 office-hours window. `start` is
// "HH:MM" (zero-padded 24h), same format used throughout the booking
// use-cases — string comparison is safe for that format. `date` is
// "YYYY-MM-DD".
const OFFICE_HOURS_START = '08:30';
const OFFICE_HOURS_END = '18:00';

// .getUTCDay() (not .getDay()) — a date-only 'YYYY-MM-DD' string is always
// parsed as UTC midnight, and reading it back as the *calendar* day of
// week (not converted to server-local time first) is what we actually
// want here, regardless of what timezone this process happens to run in.
function isWeekend(dateStr) {
  const day = new Date(dateStr).getUTCDay();
  return day === 0 || day === 6; // Sunday, Saturday
}

export function isOutOfHours({ date, start, isHoliday }) {
  return isWeekend(date) || Boolean(isHoliday) || start < OFFICE_HOURS_START || start >= OFFICE_HOURS_END;
}
