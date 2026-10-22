// Collapses the days of each multi-day booking (shared groupId) into one
// entry, so a list can show "ห้อง 1637 · 22–24 ต.ค. (3 วัน)" once instead of
// three near-identical rows. Single-day bookings come through as a group of
// one. Keeps the order of each group's first appearance; days are sorted by date.
export function groupBookings(bookings) {
  const groups = [];
  const byGroupId = new Map();
  for (const b of bookings) {
    const existing = b.groupId && byGroupId.get(b.groupId);
    if (existing) { existing.days.push(b); continue; }
    const group = { key: b.groupId || `b${b.id}`, days: [b] };
    if (b.groupId) byGroupId.set(b.groupId, group);
    groups.push(group);
  }
  for (const g of groups) g.days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return groups;
}
