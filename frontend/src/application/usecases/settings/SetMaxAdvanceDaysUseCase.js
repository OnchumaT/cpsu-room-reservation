/** Sets how many days ahead a booking may be made — admin-only; the
 * backend rejects with 403 for anyone else and re-validates the range. */
export class SetMaxAdvanceDaysUseCase {
  constructor({ settingsRepository }) {
    this.settingsRepository = settingsRepository;
  }

  async execute({ days }) {
    const parsed = Number(days);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
      return { success: false, reason: 'invalid-days' };
    }
    await this.settingsRepository.setMaxAdvanceDays(parsed);
    return { success: true, days: parsed };
  }
}
