export class CreateEquipmentUseCase {
  constructor({ equipmentRepository }) {
    this.equipmentRepository = equipmentRepository;
  }

  async execute({ name, unit, iconKey, total }) {
    if (!name || !name.trim()) return { success: false, reason: 'missing-name' };
    if (!unit || !unit.trim()) return { success: false, reason: 'missing-unit' };
    try {
      const equipment = await this.equipmentRepository.add({ name: name.trim(), unit: unit.trim(), iconKey, total });
      return { success: true, equipment };
    } catch (err) {
      return { success: false, reason: err.status === 409 ? 'duplicate-name' : 'error', message: err.message };
    }
  }
}
