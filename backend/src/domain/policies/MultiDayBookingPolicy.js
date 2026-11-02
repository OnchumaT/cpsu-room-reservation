// Pure, no I/O — which calendar dates a multi-day booking covers.
//
// A multi-day booking is the same room and the same start–end time on every
// date from `date` to `endDate` (inclusive), stored as one booking row per
// day sharing a groupId. With `skipNonWorkingDays`, Saturdays, Sundays and
// the given holidays are left out instead of being booked out-of-hours.
// Dates are 'YYYY-MM-DD' and handled as UTC midnights, so the server's
// timezone can't shift a day.
// Sanity cap on days in one request (API abuse guard) — far above what a
// weekly repeat reaches; how far ahead is BookingSetting.maxAdvanceDays,
// which the admin can raise or lower.
export const MAX_BOOKING_DAYS = 60;

/** [0..6] (Sun..Sat) -> unique, sorted, valid; anything else -> []. */
export function normalizeWeekdays(weekdays) {
  const list = Array.isArray(weekdays) ? weekdays : String(weekdays ?? '').split(',');
  // Blank cells are dropped first — Number('') is 0, which would read as "Sundays only".
  return [...new Set(list.filter((v) => String(v).trim() !== '').map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
}

const DAY_MS = 86400000;

function isWeekend(dateStr) {
  const day = new Date(dateStr).getUTCDay();
  return day === 0 || day === 6;
}

/** Number of calendar days from `date` to `endDate`, both included. */
export function spanDays(date, endDate) {
  return Math.round((new Date(endDate) - new Date(date)) / DAY_MS) + 1;
}

// `weekdays` (repeat weekly, e.g. [1] = every Monday) keeps only those days
// of the week; then skipNonWorkingDays only skips holidays, since the
// weekdays themselves were picked on purpose.
/** 'YYYY-MM-DD' list (array or comma-separated) -> valid unique dates. */
export function normalizeDateList(dates) {
  const list = Array.isArray(dates) ? dates : String(dates ?? '').split(',');
  return [...new Set(list.map((d) => String(d).trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
}

// `excludeDates`: days the booker clicked off on the calendar (e.g. an exam week).
export function bookingDates({ date, endDate, skipNonWorkingDays = false, holidayDates = [], weekdays = [], excludeDates = [] }) {
  if (!endDate || endDate === date) return [date];
  const holidays = new Set(holidayDates);
  const repeatDays = new Set(normalizeWeekdays(weekdays));
  const excluded = new Set(normalizeDateList(excludeDates));
  const dates = [];
  for (let t = new Date(date).getTime(); t <= new Date(endDate).getTime(); t += DAY_MS) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (excluded.has(d)) continue;
    if (repeatDays.size) {
      if (!repeatDays.has(new Date(d).getUTCDay())) continue;
      if (skipNonWorkingDays && holidays.has(d)) continue;
    } else if (skipNonWorkingDays && (isWeekend(d) || holidays.has(d))) continue;
    dates.push(d);
  }
  return dates;
}
