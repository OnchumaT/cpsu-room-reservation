import { AppError } from '../../../utils/AppError.js';
import { isValidCap, isValidFloor, isValidEquipment, isValidHue } from './CreateRoomUseCase.js';

export class UpdateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId, cap, floor, status, equipment, buildingId, colorHue }) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw AppError.notFound('Room not found');
    if (cap != null && !isValidCap(cap)) throw AppError.badRequest('cap must be a whole number of at least 1');
    if (floor != null && !isValidFloor(floor)) throw AppError.badRequest('floor must be a whole number of at least 1');
    if (equipment != null && !isValidEquipment(equipment)) throw AppError.badRequest('equipment counts must be whole numbers of at least 0');
    if (colorHue != null && !isValidHue(colorHue)) throw AppError.badRequest('colorHue must be a whole number from 0 to 359');
    const updated = await this.roomRepository.update(roomId, {
      cap: cap || room.cap,
      floor: floor || room.floor,
      status: status || room.status,
      equipment: equipment || room.equipment,
      buildingId: buildingId !== undefined ? (buildingId ? Number(buildingId) : null) : undefined,
      colorHue: colorHue != null ? Number(colorHue) : undefined,
    });
    return { success: true, room: updated };
  }
}
