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

  // Same single-row settings record as approvalMode/maxAdvanceDays above.
  async function getRetentionDays() {
    const { setting } = await apiClient.get('/settings/approval');
    return setting.retentionDays;
  }

  async function setRetentionDays(days) {
    return apiClient.patch('/settings/retention-days', { days });
  }

  async function archiveOldBookings() {
    return apiClient.post('/settings/archive-bookings');
  }

  // Same single-row settings record as the getters above.
  async function getToggles() {
    const { setting } = await apiClient.get('/settings/approval');
    return {
      email: setting.emailNotificationsEnabled,
      reminder30: setting.reminderBeforeBookingEnabled,
      noOverlap: setting.preventOverlapBooking,
      checkIn: setting.checkInRequired,
    };
  }

  async function getCheckInGraceMinutes() {
    const { setting } = await apiClient.get('/settings/approval');
    return setting.checkInGraceMinutes;
  }

  async function setCheckInGraceMinutes(minutes) {
    return apiClient.patch('/settings/check-in-grace', { minutes });
  }

  async function setToggle(key, value) {
    return apiClient.patch('/settings/toggles', { key, value });
  }

  return {
    getApprovalMode, setApprovalMode, getMaxAdvanceDays, setMaxAdvanceDays,
    getRetentionDays, setRetentionDays, archiveOldBookings,
    getToggles, setToggle, getCheckInGraceMinutes, setCheckInGraceMinutes,
  };
}
