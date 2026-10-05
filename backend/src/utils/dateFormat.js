// "YYYY-MM-DD" -> "DD-MM-YYYY" for text shown to people (notifications, emails).
// Stored and API dates stay ISO; this only changes how they are written out.
export function formatDateDMY(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}
