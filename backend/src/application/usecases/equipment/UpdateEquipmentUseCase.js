import { AppError } from '../../../utils/AppError.js';

export class UpdateEquipmentUseCase {
  constructor({ equipmentRepository }) {
    this.equipmentRepository = equipmentRepository;
  }

  async execute({ key, total, damaged }) {
    const existing = await this.equipmentRepository.findByKey(key);
    if (!existing) throw AppError.notFound('Equipment not found');
    if (total !== undefined && (!Number.isInteger(total) || total < 0)) {
      throw AppError.badRequest('total must be a non-negative integer');
    }
    if (damaged !== undefined && (!Number.isInteger(damaged) || damaged < 0)) {
      throw AppError.badRequest('damaged must be a non-negative integer');
    }
    const nextTotal = total ?? existing.total;
    const nextDamaged = damaged ?? existing.damaged;
    if (nextDamaged > nextTotal) throw AppError.badRequest('damaged cannot exceed total');
    const updated = await this.equipmentRepository.update(key, { total, damaged });
    return { success: true, equipment: updated };
  }
}
