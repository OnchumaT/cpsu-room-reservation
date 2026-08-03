// Cache-backed like the other Api*Repositories — `refresh()` is the only
// async method, called by DashboardView's `load()` before it renders.
export function createDashboardRepository({ apiClient }) {
  let cache = null;

  async function refresh() {
    const { stats } = await apiClient.get('/dashboard/stats');
    cache = stats;
    return cache;
  }

  function getStats() {
    return cache;
  }

  return { refresh, getStats };
}
