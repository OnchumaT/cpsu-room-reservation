// "YYYY-MM-DD" -> "DD-MM-YYYY" for display. Values stored and sent to the API stay ISO.
export function formatDateDMY(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}
