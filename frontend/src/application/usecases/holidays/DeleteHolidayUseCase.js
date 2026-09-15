export class DeleteHolidayUseCase {
  constructor({ holidayRepository }) {
    this.holidayRepository = holidayRepository;
  }

  async execute({ holidayId }) {
    await this.holidayRepository.remove(holidayId);
    return { success: true };
  }
}
