import { AppError } from '../../../utils/AppError.js';

export class UpdateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId, cap, floor, status, equipment, buildingId }) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw AppError.notFound('Room not found');
    const updated = await this.roomRepository.update(roomId, {
      cap: cap || room.cap,
      floor: floor || room.floor,
      status: status || room.status,
      equipment: equipment || room.equipment,
      buildingId: buildingId !== undefined ? (buildingId ? Number(buildingId) : null) : undefined,
    });
    return { success: true, room: updated };
  }
}
