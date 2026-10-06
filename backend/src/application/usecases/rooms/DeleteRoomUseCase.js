import { AppError } from '../../../utils/AppError.js';

export class DeleteRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ roomId }) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw AppError.notFound('Room not found');
    const usage = await this.roomRepository.countReferences(roomId);
    if (usage.bookings + usage.templates + usage.classSchedules + usage.clashAttempts > 0) {
      throw AppError.conflict('ลบห้องไม่ได้ เพราะยังมีการจอง เทมเพลต หรือคาบเรียนของห้องนี้ ให้ปิดใช้งานห้องแทน', { usage });
    }
    await this.roomRepository.remove(roomId);
    return { success: true };
  }
}
