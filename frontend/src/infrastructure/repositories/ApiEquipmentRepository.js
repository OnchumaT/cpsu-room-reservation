import { BOOKING_EQUIPMENT_OPTIONS } from '../../shared/constants.js';

// Labels for the original four items, used only until the first refresh()
// lands so a booking detail opened straight after login still reads right.
const FALLBACK = Object.fromEntries(BOOKING_EQUIPMENT_OPTIONS.map((o) => [o.k, { name: o.nm, unit: o.avail.split(' ')[1] }]));

// Cache-backed, same shape as ApiBuildingRepository — refresh() is the only
// read that hits the API, getAll()/getActive() read the last-fetched cache
// synchronously. Plain objects (no domain entity class): this data has no
// behavior. The cache keeps soft-deleted items (`deleted: true`) so
// label() can still name them on old bookings; pickers use getActive().
export function createEquipmentRepository({ apiClient }) {
  let cache = [];

  async function refresh() {
    const { equipment } = await apiClient.get('/equipment');
    cache = equipment;
    return cache;
  }

  function getAll() {
    return cache;
  }

  function getActive() {
    return cache.filter((e) => !e.deleted);
  }

  function findByKey(key) {
    return cache.find((e) => e.key === key);
  }

  /** "ไมโครโฟน 2 ตัว"-style label for a booking's { key: qty } entry. */
  function label(key, qty, { withUnit = false } = {}) {
    const e = findByKey(key) || FALLBACK[key];
    const name = e?.name || key;
    return withUnit ? `${name} ${qty} ${e?.unit || 'ชิ้น'}` : `${name} ${qty}`;
  }

  async function add({ name, unit, iconKey, total }) {
    const { equipment } = await apiClient.post('/equipment', { name, unit, iconKey, total });
    cache = [...cache, equipment];
    return equipment;
  }

  async function update(key, { total, damaged }) {
    const { equipment } = await apiClient.patch(`/equipment/${key}`, { total, damaged });
    cache = cache.map((e) => (e.key === key ? equipment : e));
    return equipment;
  }

  async function remove(key) {
    await apiClient.delete(`/equipment/${key}`);
    cache = cache.map((e) => (e.key === key ? { ...e, deleted: true } : e));
  }

  return { refresh, getAll, getActive, findByKey, label, add, update, remove };
}
