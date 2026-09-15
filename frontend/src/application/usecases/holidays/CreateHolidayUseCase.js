export class CreateHolidayUseCase {
  constructor({ holidayRepository }) {
    this.holidayRepository = holidayRepository;
  }

  async execute({ date, name }) {
    if (!date || !name || !name.trim()) return { success: false, reason: 'missing-fields' };
    try {
      const holiday = await this.holidayRepository.add({ date, name: name.trim() });
      return { success: true, holiday };
    } catch (err) {
      return { success: false, reason: err.status === 409 ? 'duplicate-date' : 'error' };
    }
  }
}
