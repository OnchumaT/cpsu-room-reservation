import { Room } from '../../domain/entities/Room.js';
import { registerRoomColors } from '../../shared/roomColors.js';

// Cache-backed: `refresh()` is the only async method, called by a view's
// `load()` before it renders. `getAll()`/`findById()` stay synchronous —
// reading from the last-fetched cache — so the render() bodies that
// already call them don't need to become async themselves.
export function createRoomRepository({ apiClient }) {
  let cache = [];

  async function refresh({ query, status } = {}) {
    const { rooms } = await apiClient.get('/rooms', { q: query, status });
    cache = rooms.map((r) => new Room(r));
    registerRoomColors(cache);
    return cache;
  }

  function getAll() {
    return cache;
  }

  function findById(id) {
    return cache.find((r) => r.id === id);
  }

  /** One-off, not cached — the booking form re-fetches this every time date/start/end changes. */
  async function getAvailable({ date, endDate, skipNonWorkingDays, weekdays, excludeDates, start, end }) {
    const { rooms } = await apiClient.get('/rooms/available', { date, endDate, skipNonWorkingDays, weekdays: weekdays?.length ? weekdays.join(',') : undefined, excludeDates: excludeDates?.length ? excludeDates.join(',') : undefined, start, end });
    return rooms.map((r) => new Room(r));
  }

  async function add({ id, cap, floor, status, buildingId, colorHue }) {
    const { room } = await apiClient.post('/rooms', { id, cap, floor, status, buildingId, colorHue });
    const entity = new Room(room);
    cache = [...cache, entity];
    registerRoomColors(cache);
    return entity;
  }

  async function update(id, changes) {
    const { room } = await apiClient.patch(`/rooms/${encodeURIComponent(id)}`, changes);
    const entity = new Room(room);
    cache = cache.map((r) => (r.id === id ? entity : r));
    registerRoomColors(cache);
    return entity;
  }

  async function toggleStatus(id) {
    const { room } = await apiClient.patch(`/rooms/${encodeURIComponent(id)}/toggle`);
    const entity = new Room(room);
    cache = cache.map((r) => (r.id === id ? entity : r));
    return entity;
  }

  async function remove(id) {
    await apiClient.delete(`/rooms/${encodeURIComponent(id)}`);
    cache = cache.filter((r) => r.id !== id);
  }

  /** The secret for the room's printed check-in QR code (staff/admin). */
  async function getCheckInToken(id) {
    const { token } = await apiClient.get(`/rooms/${encodeURIComponent(id)}/check-in-token`);
    return token;
  }

  return { refresh, getAll, findById, getAvailable, add, update, toggleStatus, remove, getCheckInToken };
}
