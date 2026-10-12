export class UpdateEquipmentUseCase {
  constructor({ equipmentRepository }) {
    this.equipmentRepository = equipmentRepository;
  }

  async execute({ key, total, damaged }) {
    try {
      const equipment = await this.equipmentRepository.update(key, { total, damaged });
      return { success: true, equipment };
    } catch (err) {
      return { success: false, reason: err.message || 'error' };
    }
  }
}
