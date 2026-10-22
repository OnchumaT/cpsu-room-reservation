// Pure, no I/O — which calendar dates a multi-day booking covers.
//
// A multi-day booking is the same room and the same start–end time on every
// date from `date` to `endDate` (inclusive), stored as one booking row per
// day sharing a groupId. With `skipNonWorkingDays`, Saturdays, Sundays and
// the given holidays are left out instead of being booked out-of-hours.
// Dates are 'YYYY-MM-DD' and handled as UTC midnights, so the server's
// timezone can't shift a day.
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

export function bookingDates({ date, endDate, skipNonWorkingDays = false, holidayDates = [] }) {
  if (!endDate || endDate === date) return [date];
  const holidays = new Set(holidayDates);
  const dates = [];
  for (let t = new Date(date).getTime(); t <= new Date(endDate).getTime(); t += DAY_MS) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (skipNonWorkingDays && (isWeekend(d) || holidays.has(d))) continue;
    dates.push(d);
  }
  return dates;
}
