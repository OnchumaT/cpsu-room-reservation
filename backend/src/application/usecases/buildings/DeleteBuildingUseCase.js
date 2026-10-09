export class DeleteBuildingUseCase {
  constructor({ buildingRepository }) {
    this.buildingRepository = buildingRepository;
  }

  async execute({ id }) {
    await this.buildingRepository.remove(id);
    return { success: true };
  }
}
