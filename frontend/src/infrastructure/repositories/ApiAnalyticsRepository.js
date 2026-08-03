// Cache-backed like the other Api*Repositories — `refresh()` is the only
// async method, called by AnalyticsView's `load()` before it renders.
export function createAnalyticsRepository({ apiClient }) {
  let cache = null;

  async function refresh() {
    const { analytics } = await apiClient.get('/analytics');
    cache = analytics;
    return cache;
  }

  function getAnalytics() {
    return cache;
  }

  return { refresh, getAnalytics };
}
