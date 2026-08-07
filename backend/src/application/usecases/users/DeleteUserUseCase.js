import { AppError } from '../../../utils/AppError.js';

export class DeleteUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId, actor }) {
    if (String(actor.id) === String(userId)) {
      throw AppError.badRequest('ไม่สามารถลบบัญชีของตัวเองได้');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');

    const hasHistory = await this.userRepository.hasBookingHistory(userId);
    if (hasHistory) {
      throw AppError.badRequest('ผู้ใช้นี้มีประวัติการจอง/อนุมัติอยู่ในระบบ ไม่สามารถลบได้ กรุณาระงับการใช้งานแทน');
    }

    await this.userRepository.remove(userId);
    return { success: true };
  }
}
