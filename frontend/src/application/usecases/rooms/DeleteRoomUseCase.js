export class DeleteRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId }) {
    await this.roomRepository.remove(roomId);
    return { success: true };
  }
}
