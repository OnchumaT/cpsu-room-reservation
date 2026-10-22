// All dates shown on screen are "<weekday> DD/MM/YYYY" with a short Thai
// weekday and a Buddhist-era year (Gregorian + 543), e.g. 2026-10-20 ->
// "อ. 20/10/2569". Printed documents (PDF) use formatDatePlain — no weekday.
// Values stored and sent to the API stay ISO "YYYY-MM-DD"; this only changes
// how they are written out.

export const THAI_WEEKDAY_ABBR = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const pad2 = (n) => String(n).padStart(2, '0');

// A plain "YYYY-MM-DD" is read as-is (no timezone shift); anything else
// (a Date, or a full ISO timestamp like createdAt) uses the local calendar day.
function dateParts(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return { y, m, d, dow: new Date(y, m - 1, d).getDay() };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate(), dow: date.getDay() };
}

/** "2026-10-20" / Date / ISO timestamp -> "20/10/2569" (no weekday — for PDFs) */
export function formatDatePlain(value) {
  const p = dateParts(value);
  return p ? `${pad2(p.d)}/${pad2(p.m)}/${p.y + 543}` : '';
}

/** "2026-10-20" / Date / ISO timestamp -> "อ. 20/10/2569" */
export function formatDateDMY(value) {
  const p = dateParts(value);
  return p ? `${THAI_WEEKDAY_ABBR[p.dow]} ${formatDatePlain(value)}` : '';
}

/** ISO timestamp -> "อ. 20/10/2569 14:26" */
export function formatDateTimeDMY(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDateDMY(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** The days of a multi-day booking, e.g. "อ. 20/10/2569 – พฤ. 22/10/2569 (3 วัน)"; one date reads as formatDateDMY. */
export function formatDateSpan(dates) {
  const sorted = [...dates].sort();
  if (sorted.length <= 1) return formatDateDMY(sorted[0]);
  return `${formatDateDMY(sorted[0])} – ${formatDateDMY(sorted[sorted.length - 1])} (${sorted.length} วัน)`;
}
