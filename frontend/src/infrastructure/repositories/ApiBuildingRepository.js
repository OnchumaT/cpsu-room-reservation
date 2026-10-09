import { Building } from '../../domain/entities/Building.js';

// Cache-backed, same shape as ApiHolidayRepository — refresh() is the only
// async method, getAll() reads the last-fetched cache synchronously.
export function createBuildingRepository({ apiClient }) {
  let cache = [];

  async function refresh() {
    const { buildings } = await apiClient.get('/buildings');
    cache = buildings.map((b) => new Building(b));
    return cache;
  }

  function getAll() {
    return cache;
  }

  function findById(id) {
    return cache.find((b) => String(b.id) === String(id));
  }

  async function add({ name }) {
    const { building } = await apiClient.post('/buildings', { name });
    const entity = new Building(building);
    cache = [...cache, entity].sort((a, b) => a.name.localeCompare(b.name));
    return entity;
  }

  async function remove(id) {
    await apiClient.delete(`/buildings/${id}`);
    cache = cache.filter((b) => String(b.id) !== String(id));
  }

  return { refresh, getAll, findById, add, remove };
}
