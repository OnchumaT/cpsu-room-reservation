export class ToggleRoomStatusUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  execute({ roomId }) {
    const room = this.roomRepository.findById(roomId);
    if (!room) return { success: false };
    room.toggleStatus();
    return { success: true, room };
  }
}
