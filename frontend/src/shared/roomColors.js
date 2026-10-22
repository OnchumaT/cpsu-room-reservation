// Room color-coding — split out of constants.js (which stays truthfully
// dependency-free/stateless per its own header comment) since this file
// owns one bit of mutable module state: a registry of real per-room
// colors, populated from the backend's assigned `colorHue` (see
// CreateRoomUseCase.pickRoomHue) so every room is guaranteed visually
// distinct — not just approximately distinct via a hash into a small
// fixed palette, which could (and eventually would) collide.

export const ROOM_COLORS = {
  '1637': { bg: '#DBEAFE', text: '#1e3a8a', bar: '#3b82f6' },
  '1638': { bg: '#D1FAE5', text: '#065f46', bar: '#10b981' },
  '1639': { bg: '#FEF3C7', text: '#92400e', bar: '#f59e0b' },
  '1640': { bg: '#F3E8FF', text: '#6b21a8', bar: '#a855f7' },
  '1641': { bg: '#FFE4E6', text: '#9f1239', bar: '#f43f5e' },
};

// Defensive fallback only — for a room id `getRoomColor` is asked about
// before `registerRoomColors` has ever run (e.g. very first paint). Once
// the room list has loaded, every non-curated room has a real persisted
// hue and this hash is never consulted for it.
const EXTENDED_ROOM_PALETTE = [
  { bg: '#E0E7FF', text: '#3730a3', bar: '#6366f1' },
  { bg: '#CCFBF1', text: '#115e59', bar: '#14b8a6' },
  { bg: '#FFEDD5', text: '#9a3412', bar: '#f97316' },
  { bg: '#FCE7F3', text: '#9d174d', bar: '#ec4899' },
  { bg: '#ECFCCB', text: '#3f6212', bar: '#84cc16' },
  { bg: '#CFFAFE', text: '#155e75', bar: '#06b6d4' },
  { bg: '#EDE9FE', text: '#5b21b6', bar: '#8b5cf6' },
  { bg: '#E7E5E4', text: '#44403c', bar: '#78716c' },
];

function hashRoomId(room) {
  const str = String(room);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

// Hues of ROOM_COLORS above (same values as the backend's CURATED_HUES) —
// so the color picker can start from a curated room's current color.
export const CURATED_ROOM_HUES = { '1637': 217, '1638': 160, '1639': 38, '1640': 271, '1641': 350 };

/** The { bg, text, bar } trio every room color is derived from its hue. */
export function hueToRoomColor(hue) {
  return {
    bg: `hsl(${hue}, 85%, 94%)`,
    text: `hsl(${hue}, 60%, 30%)`,
    bar: `hsl(${hue}, 85%, 58%)`,
  };
}

const registry = new Map(); // roomId -> { bg, text, bar }

/** Called by ApiRoomRepository whenever the room cache is (re)populated —
 * every view that shows rooms/bookings already triggers roomRepository
 * .refresh() before rendering, so this stays in sync for free. */
export function registerRoomColors(rooms) {
  registry.clear();
  for (const r of rooms) {
    if (r.colorHue == null) continue;
    registry.set(r.id, hueToRoomColor(r.colorHue));
  }
}

// Single lookup every view should use so room color-coding (calendar legend,
// list chips, chart bars) stays in sync — see Calendar.jsx's legend.
export function getRoomColor(room) {
  return registry.get(room) || ROOM_COLORS[room] || EXTENDED_ROOM_PALETTE[hashRoomId(room) % EXTENDED_ROOM_PALETTE.length];
}
