import { Room } from '../../domain/entities/Room.js';

// Cache-backed: `refresh()` is the only async method, called by a view's
// `load()` before it renders. `getAll()`/`findById()` stay synchronous —
// reading from the last-fetched cache — so the render() bodies that
// already call them don't need to become async themselves.
export function createRoomRepository({ apiClient }) {
  let cache = [];

  async function refresh({ query, status } = {}) {
    const { rooms } = await apiClient.get('/rooms', { q: query, status });
    cache = rooms.map((r) => new Room(r));
    return cache;
  }

  function getAll() {
    return cache;
  }

  function findById(id) {
    return cache.find((r) => r.id === id);
  }

  /** One-off, not cached — the booking form re-fetches this every time date/start/end changes. */
  async function getAvailable({ date, start, end }) {
    const { rooms } = await apiClient.get('/rooms/available', { date, start, end });
    return rooms.map((r) => new Room(r));
  }

  async function add({ id, cap, floor, status }) {
    const { room } = await apiClient.post('/rooms', { id, cap, floor, status });
    const entity = new Room(room);
    cache = [...cache, entity];
    return entity;
  }

  async function update(id, changes) {
    const { room } = await apiClient.patch(`/rooms/${id}`, changes);
    const entity = new Room(room);
    cache = cache.map((r) => (r.id === id ? entity : r));
    return entity;
  }

  async function toggleStatus(id) {
    const { room } = await apiClient.patch(`/rooms/${id}/toggle`);
    const entity = new Room(room);
    cache = cache.map((r) => (r.id === id ? entity : r));
    return entity;
  }

  async function remove(id) {
    await apiClient.delete(`/rooms/${id}`);
    cache = cache.filter((r) => r.id !== id);
  }

  return { refresh, getAll, findById, getAvailable, add, update, toggleStatus, remove };
}
