import { AppError } from '../../../utils/AppError.js';

export class SetApprovalModeUseCase {
  constructor({ bookingSettingRepository }) {
    this.bookingSettingRepository = bookingSettingRepository;
  }

  async execute({ mode, updatedBy }) {
    if (mode !== 'auto' && mode !== 'manual') throw AppError.badRequest(`Invalid approval mode: ${mode}`);
    const setting = await this.bookingSettingRepository.setMode(mode, updatedBy);
    return { success: true, setting };
  }
}
