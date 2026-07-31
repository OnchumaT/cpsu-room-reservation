export class DeleteRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  execute({ roomId }) {
    const room = this.roomRepository.findById(roomId);
    if (!room) return { success: false };
    this.roomRepository.remove(roomId);
    return { success: true };
  }
}
