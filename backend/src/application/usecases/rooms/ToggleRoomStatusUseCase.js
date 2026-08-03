import { AppError } from '../../../utils/AppError.js';

export class ToggleRoomStatusUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId }) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw AppError.notFound('Room not found');
    const nextStatus = room.status === 'available' ? 'occupied' : 'available';
    const updated = await this.roomRepository.update(roomId, { status: nextStatus });
    return { success: true, room: updated };
  }
}
