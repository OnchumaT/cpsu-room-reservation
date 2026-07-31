export class UpdateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  execute({ roomId, cap, floor, status, equipment }) {
    const room = this.roomRepository.findById(roomId);
    if (!room) return { success: false };
    this.roomRepository.update(roomId, {
      cap: cap || room.cap,
      floor: floor || room.floor,
      status: status || room.status,
      equipment: equipment || room.equipment,
    });
    return { success: true, room };
  }
}
