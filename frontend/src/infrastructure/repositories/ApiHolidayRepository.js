import { Holiday } from '../../domain/entities/Holiday.js';

// Cache-backed, same shape as ApiRoomRepository — refresh() is the only
// async method, getAll() reads the last-fetched cache synchronously.
export function createHolidayRepository({ apiClient }) {
  let cache = [];

  async function refresh() {
    const { holidays } = await apiClient.get('/holidays');
    cache = holidays.map((h) => new Holiday(h));
    return cache;
  }

  function getAll() {
    return cache;
  }

  async function add({ date, name }) {
    const { holiday } = await apiClient.post('/holidays', { date, name });
    const entity = new Holiday(holiday);
    cache = [...cache, entity].sort((a, b) => a.date.localeCompare(b.date));
    return entity;
  }

  async function remove(id) {
    await apiClient.delete(`/holidays/${id}`);
    cache = cache.filter((h) => h.id !== id);
  }

  return { refresh, getAll, add, remove };
}
