export function createSettingsRepository({ apiClient }) {
  async function getApprovalMode() {
    const { setting } = await apiClient.get('/settings/approval');
    return setting.approvalMode;
  }

  async function setApprovalMode(mode) {
    return apiClient.patch('/settings/approval', { mode });
  }

  // Same single-row settings record as approvalMode above — one GET covers
  // both fields.
  async function getMaxAdvanceDays() {
    const { setting } = await apiClient.get('/settings/approval');
    return setting.maxAdvanceDays;
  }

  async function setMaxAdvanceDays(days) {
    return apiClient.patch('/settings/advance-days', { days });
  }

  return { getApprovalMode, setApprovalMode, getMaxAdvanceDays, setMaxAdvanceDays };
}
