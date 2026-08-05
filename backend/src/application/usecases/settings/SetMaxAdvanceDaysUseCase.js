import { AppError } from '../../../utils/AppError.js';

export class SetMaxAdvanceDaysUseCase {
  constructor({ bookingSettingRepository }) {
    this.bookingSettingRepository = bookingSettingRepository;
  }

  async execute({ days, updatedBy }) {
    const parsed = Number(days);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
      throw AppError.badRequest(`Invalid max advance days: ${days}`);
    }
    const setting = await this.bookingSettingRepository.setMaxAdvanceDays(parsed, updatedBy);
    return { success: true, setting };
  }
}
