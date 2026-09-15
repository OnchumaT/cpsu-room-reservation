export class DeleteHolidayUseCase {
  constructor({ holidayRepository }) {
    this.holidayRepository = holidayRepository;
  }

  async execute({ id }) {
    await this.holidayRepository.remove(id);
    return { success: true };
  }
}
