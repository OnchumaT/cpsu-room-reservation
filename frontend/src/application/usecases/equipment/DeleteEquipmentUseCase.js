export class DeleteEquipmentUseCase {
  constructor({ equipmentRepository }) {
    this.equipmentRepository = equipmentRepository;
  }

  async execute({ key }) {
    try {
      await this.equipmentRepository.remove(key);
      return { success: true };
    } catch (err) {
      // 409 = still held by bookings that haven't ended; the message says how many.
      return { success: false, reason: err.status === 409 ? 'in-use' : 'error', message: err.message };
    }
  }
}
