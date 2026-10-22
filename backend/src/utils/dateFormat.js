// "YYYY-MM-DD" -> "<weekday> DD/MM/YYYY" with a short Thai weekday and a
// Buddhist-era year (Gregorian + 543), e.g. "2026-10-20" -> "อ. 20/10/2569",
// for text shown to people (notifications, emails). Stored and API dates stay
// ISO; this only changes how they are written out.
const THAI_WEEKDAY_ABBR = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export function formatDateDMY(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  // Date.UTC + getUTCDay: the calendar weekday of that date, whatever the server's timezone.
  const dow = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay();
  return `${THAI_WEEKDAY_ABBR[dow]} ${d}/${m}/${Number(y) + 543}`;
}

/** The days of a multi-day booking, e.g. "อ. 20/10/2569 – พฤ. 22/10/2569 (3 วัน)"; one date reads as formatDateDMY. */
export function formatDateSpan(dates) {
  const sorted = [...dates].sort();
  if (sorted.length <= 1) return formatDateDMY(sorted[0]);
  return `${formatDateDMY(sorted[0])} – ${formatDateDMY(sorted[sorted.length - 1])} (${sorted.length} วัน)`;
}
