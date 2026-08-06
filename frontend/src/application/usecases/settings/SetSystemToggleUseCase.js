/** Persists one of the three system-settings toggles (email notifications,
 * 30-min reminder, overlap prevention) — admin-only. */
export class SetSystemToggleUseCase {
  constructor({ settingsRepository }) {
    this.settingsRepository = settingsRepository;
  }

  async execute({ key, value }) {
    await this.settingsRepository.setToggle(key, value);
    return { success: true, key, value };
  }
}
