export class UpdateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId, cap, floor, status, equipment, buildingId }) {
    const room = await this.roomRepository.update(roomId, { cap, floor, status, equipment, buildingId });
    return { success: true, room };
  }
}
