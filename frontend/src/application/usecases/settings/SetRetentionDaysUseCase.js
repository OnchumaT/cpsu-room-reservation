/** Sets how many days of past booking data stay "active" before an admin
 * can archive them out of the dashboard — admin-only; the backend
 * re-validates the range. */
export class SetRetentionDaysUseCase {
  constructor({ settingsRepository }) {
    this.settingsRepository = settingsRepository;
  }

  async execute({ days }) {
    const parsed = Number(days);
    if (!Number.isInteger(parsed) || parsed < 30 || parsed > 3650) {
      return { success: false, reason: 'invalid-days' };
    }
    await this.settingsRepository.setRetentionDays(parsed);
    return { success: true, days: parsed };
  }
}
