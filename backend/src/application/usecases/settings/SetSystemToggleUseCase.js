import { AppError } from '../../../utils/AppError.js';

// Wire format matches SettingsView.jsx's INITIAL_TOGGLES keys exactly, so
// no remapping happens on the frontend side.
const TOGGLE_FIELD_MAP = {
  email: 'emailNotificationsEnabled',
  reminder30: 'reminderBeforeBookingEnabled',
  noOverlap: 'preventOverlapBooking',
};

export class SetSystemToggleUseCase {
  constructor({ bookingSettingRepository }) {
    this.bookingSettingRepository = bookingSettingRepository;
  }

  async execute({ key, value, updatedBy }) {
    const field = TOGGLE_FIELD_MAP[key];
    if (!field) throw AppError.badRequest(`Invalid toggle key: ${key}`);
    if (typeof value !== 'boolean') throw AppError.badRequest('value must be a boolean');
    const setting = await this.bookingSettingRepository.setToggle(field, value, updatedBy);
    return { success: true, setting };
  }
}
