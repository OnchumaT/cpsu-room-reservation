export function createManagementPositionRepository({ apiClient }) {
  let cache = [];

  async function refresh() {
    const { positions } = await apiClient.get('/management-positions');
    cache = positions;
    return cache;
  }

  function getAll() {
    return cache;
  }

  async function assign(userId, positionId) {
    return apiClient.post('/management-positions/assign', { userId, positionId });
  }

  async function unassign(userId, positionId) {
    return apiClient.post('/management-positions/unassign', { userId, positionId });
  }

  return { refresh, getAll, assign, unassign };
}
