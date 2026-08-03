import { AppError } from '../../../utils/AppError.js';

export class UpdateUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId, name, role }) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    const updated = await this.userRepository.update(userId, {
      name: name || user.name,
      role: role || user.role,
    });
    return { success: true, user: updated };
  }
}
