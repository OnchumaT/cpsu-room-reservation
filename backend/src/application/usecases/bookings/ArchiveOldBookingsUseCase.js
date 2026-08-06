const DEFAULT_RETENTION_DAYS = 365;

/**
 * Admin-triggered (no scheduler exists yet — see backend/README.md-style
 * comments elsewhere): soft-archives bookings older than the configured
 * BookingSetting.retentionDays out of the dashboard/analytics view. The
 * rows themselves are untouched, so a user's own booking history is
 * unaffected.
 */
export class ArchiveOldBookingsUseCase {
  constructor({ bookingRepository, bookingSettingRepository, auditLogRepository }) {
    this.bookingRepository = bookingRepository;
    this.bookingSettingRepository = bookingSettingRepository;
    this.auditLogRepository = auditLogRepository;
  }

  async execute({ triggeredBy }) {
    const retentionDays = (await this.bookingSettingRepository.getRetentionDays()) ?? DEFAULT_RETENTION_DAYS;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const archivedCount = await this.bookingRepository.archiveOlderThan(cutoffDate);
    await this.auditLogRepository.create({
      userId: triggeredBy,
      action: 'bookings.archive',
      details: { archivedCount, cutoffDate: cutoffDate.toISOString(), retentionDays },
    });

    return { success: true, archivedCount, cutoffDate };
  }
}
