// Cache-backed, same shape as ApiBuildingRepository — refresh() is the only
// async method, getAll() reads the last-fetched cache synchronously. Plain
// objects (no domain entity class): this data has no behavior, just the
// live counts that used to be hardcoded in BOOKING_EQUIPMENT_OPTIONS.
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

  function findByKey(key) {
    return cache.find((e) => e.key === key);
  }

  async function update(key, { total, damaged }) {
    const { equipment } = await apiClient.patch(`/equipment/${key}`, { total, damaged });
    cache = cache.map((e) => (e.key === key ? equipment : e));
    return equipment;
  }

  return { refresh, getAll, findByKey, update };
}
