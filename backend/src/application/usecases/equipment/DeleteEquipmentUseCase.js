import { AppError } from '../../../utils/AppError.js';

export class DeleteEquipmentUseCase {
  constructor({ equipmentRepository }) {
    this.equipmentRepository = equipmentRepository;
  }

  async execute({ key }) {
    const existing = await this.equipmentRepository.findByKey(key);
    if (!existing || existing.deleted) throw AppError.notFound('Equipment not found');
    // Bookings still holding units would lose track of them — wait until
    // they end (or are cancelled) before removing the item.
    if (existing.inUse > 0) {
      throw AppError.conflict(`ลบไม่ได้ ${existing.name} ยังถูกจองใช้งานอยู่ ${existing.inUse} ${existing.unit}`);
    }
    await this.equipmentRepository.softDelete(key);
    return { success: true };
  }
}
