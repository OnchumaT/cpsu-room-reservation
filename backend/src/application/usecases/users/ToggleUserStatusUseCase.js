import { AppError } from '../../../utils/AppError.js';

export class ToggleUserStatusUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId }) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    const updated = await this.userRepository.update(userId, { isActive: !user.isActive });
    return { success: true, user: updated };
  }
}
