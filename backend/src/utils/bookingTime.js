// Booking dates and times are Thai wall-clock values (a "16:30" booking
// means 16:30 in Bangkok); Thailand is UTC+7 all year (no daylight saving).
// bookingDate is stored as UTC midnight of that calendar date and start/end
// as epoch-1970 TIME values, so the UTC getters read back the stored date
// and wall-clock time — the Bangkok offset is then taken off to get the real
// moment. Independent of the server's own timezone.
export const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/** bookingDate (Date, UTC midnight) + a TIME value (Date) -> the real moment. */
export function bookingMoment(bookingDate, timeValue) {
  return new Date(Date.UTC(
    bookingDate.getUTCFullYear(), bookingDate.getUTCMonth(), bookingDate.getUTCDate(),
    timeValue.getUTCHours(), timeValue.getUTCMinutes(), timeValue.getUTCSeconds(),
  ) - BANGKOK_UTC_OFFSET_MS);
}

/** Today's Thai calendar date as the UTC-midnight Date bookingDate is stored as. */
export function thaiTodayStart(now = new Date()) {
  const thai = new Date(now.getTime() + BANGKOK_UTC_OFFSET_MS);
  return new Date(Date.UTC(thai.getUTCFullYear(), thai.getUTCMonth(), thai.getUTCDate()));
}
