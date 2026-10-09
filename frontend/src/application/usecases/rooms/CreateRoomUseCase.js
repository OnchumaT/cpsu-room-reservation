export class CreateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ id, cap, floor, status, buildingId }) {
    if (!id || !id.trim()) return { success: false, reason: 'missing-id' };
    try {
      const room = await this.roomRepository.add({ id, cap, floor, status, buildingId });
      return { success: true, room };
    } catch (err) {
      return { success: false, reason: err.status === 409 ? 'duplicate-id' : 'error' };
    }
  }
}
