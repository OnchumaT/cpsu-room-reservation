export class CreateBuildingUseCase {
  constructor({ buildingRepository }) {
    this.buildingRepository = buildingRepository;
  }

  async execute({ name }) {
    if (!name || !name.trim()) return { success: false, reason: 'missing-name' };
    try {
      const building = await this.buildingRepository.add({ name: name.trim() });
      return { success: true, building };
    } catch (err) {
      return { success: false, reason: err.status === 409 ? 'duplicate-name' : 'error' };
    }
  }
}
