import { AppError } from '../../../utils/AppError.js';

export class SetRetentionDaysUseCase {
  constructor({ bookingSettingRepository }) {
    this.bookingSettingRepository = bookingSettingRepository;
  }

  async execute({ days, updatedBy }) {
    const parsed = Number(days);
    if (!Number.isInteger(parsed) || parsed < 30 || parsed > 3650) {
      throw AppError.badRequest(`Invalid retention days: ${days}`);
    }
    const setting = await this.bookingSettingRepository.setRetentionDays(parsed, updatedBy);
    return { success: true, setting };
  }
}
