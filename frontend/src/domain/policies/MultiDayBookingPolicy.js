// Mirrors the backend's MultiDayBookingPolicy — which dates a multi-day
// booking covers (same room and time on every date from `date` to
// `endDate`, inclusive; with `skipNonWorkingDays`, Sat/Sun and holidays are
// left out). Used for the booking form's preview; the backend decides the
// actual days. Pure, no I/O. Dates are 'YYYY-MM-DD', handled as UTC midnights.
export const MAX_BOOKING_DAYS = 31;

const DAY_MS = 86400000;

function isWeekend(dateStr) {
  const day = new Date(dateStr).getUTCDay();
  return day === 0 || day === 6;
}

/** Number of calendar days from `date` to `endDate`, both included. */
export function spanDays(date, endDate) {
  return Math.round((new Date(endDate) - new Date(date)) / DAY_MS) + 1;
}

/** `date` + `days` calendar days, as 'YYYY-MM-DD'. */
export function addDaysIso(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function bookingDates({ date, endDate, skipNonWorkingDays = false, holidayDates = [] }) {
  if (!date) return [];
  if (!endDate || endDate <= date) return [date];
  const holidays = new Set(holidayDates);
  const dates = [];
  for (let t = new Date(date).getTime(); t <= new Date(endDate).getTime(); t += DAY_MS) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (skipNonWorkingDays && (isWeekend(d) || holidays.has(d))) continue;
    dates.push(d);
  }
  return dates;
}
