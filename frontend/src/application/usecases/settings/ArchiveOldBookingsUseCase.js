/** Admin-triggered: soft-archives bookings older than the configured
 * retention window out of the dashboard/analytics view. */
export class ArchiveOldBookingsUseCase {
  constructor({ settingsRepository }) {
    this.settingsRepository = settingsRepository;
  }

  async execute() {
    const result = await this.settingsRepository.archiveOldBookings();
    return { success: true, archivedCount: result.archivedCount };
  }
}
