export class UpdateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId, cap, floor, status, equipment }) {
    const room = await this.roomRepository.update(roomId, { cap, floor, status, equipment });
    return { success: true, room };
  }
}
