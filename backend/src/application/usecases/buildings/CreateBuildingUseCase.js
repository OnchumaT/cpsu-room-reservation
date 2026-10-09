import { AppError } from '../../../utils/AppError.js';

export class CreateBuildingUseCase {
  constructor({ buildingRepository }) {
    this.buildingRepository = buildingRepository;
  }

  async execute({ name }) {
    if (!name?.trim()) throw AppError.badRequest('name is required');
    if (await this.buildingRepository.findByName(name.trim())) {
      throw AppError.conflict(`มีตึก "${name.trim()}" อยู่แล้ว`);
    }
    const building = await this.buildingRepository.add({ name: name.trim() });
    return { success: true, building };
  }
}
