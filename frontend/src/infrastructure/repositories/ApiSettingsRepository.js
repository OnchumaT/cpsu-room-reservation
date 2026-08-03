export function createSettingsRepository({ apiClient }) {
  async function getApprovalMode() {
    const { setting } = await apiClient.get('/settings/approval');
    return setting.approvalMode;
  }

  async function setApprovalMode(mode) {
    return apiClient.patch('/settings/approval', { mode });
  }

  return { getApprovalMode, setApprovalMode };
}
