import { AppError } from '../../../utils/AppError.js';

export class CreateHolidayUseCase {
  constructor({ holidayRepository }) {
    this.holidayRepository = holidayRepository;
  }

  async execute({ date, name }) {
    if (!date?.trim() || !name?.trim()) throw AppError.badRequest('date and name are required');
    if (await this.holidayRepository.findByDate(date)) {
      throw AppError.conflict(`มีวันหยุดของวันที่ ${date} อยู่แล้ว`);
    }
    const holiday = await this.holidayRepository.add({ date, name: name.trim() });
    return { success: true, holiday };
  }
}
