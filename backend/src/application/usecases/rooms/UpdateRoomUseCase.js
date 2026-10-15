import { AppError } from '../../../utils/AppError.js';
import { isValidCap } from './CreateRoomUseCase.js';

export class UpdateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId, cap, floor, status, equipment, buildingId }) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw AppError.notFound('Room not found');
    if (cap != null && !isValidCap(cap)) throw AppError.badRequest('cap must be a whole number of at least 1');
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
