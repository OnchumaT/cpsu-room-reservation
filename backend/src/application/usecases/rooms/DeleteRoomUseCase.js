import { AppError } from '../../../utils/AppError.js';

export class DeleteRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId }) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw AppError.notFound('Room not found');
    await this.roomRepository.remove(roomId);
    return { success: true };
  }
}
