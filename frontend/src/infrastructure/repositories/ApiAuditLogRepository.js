// Admin-only activity log (GET /audit-logs). Not cached — every month picked
// in AuditLogView is a fresh read, since the log keeps growing.
export function createAuditLogRepository({ apiClient }) {
  async function listForMonth(month) {
    const { logs } = await apiClient.get('/audit-logs', { month });
    return logs;
  }

  return { listForMonth };
}
