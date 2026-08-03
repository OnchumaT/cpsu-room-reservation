export class ToggleRoomStatusUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId }) {
    const room = await this.roomRepository.toggleStatus(roomId);
    return { success: true, room };
  }
}
