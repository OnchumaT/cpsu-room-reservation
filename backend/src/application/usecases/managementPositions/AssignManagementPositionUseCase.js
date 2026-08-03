import { AppError } from '../../../utils/AppError.js';

export class AssignManagementPositionUseCase {
  constructor({ managementPositionRepository, userRepository }) {
    this.managementPositionRepository = managementPositionRepository;
    this.userRepository = userRepository;
  }

  async assign({ userId, positionId }) {
    if (!(await this.userRepository.findById(userId))) throw AppError.notFound('User not found');
    if (!(await this.managementPositionRepository.findById(positionId))) throw AppError.notFound('Position not found');
    await this.managementPositionRepository.assign(userId, positionId);
    const positions = await this.managementPositionRepository.getForUser(userId);
    return { success: true, positions };
  }

  async unassign({ userId, positionId }) {
    await this.managementPositionRepository.unassign(userId, positionId);
    const positions = await this.managementPositionRepository.getForUser(userId);
    return { success: true, positions };
  }
}
