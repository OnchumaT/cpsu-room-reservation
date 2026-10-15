import { AppError } from '../../../utils/AppError.js';
import { DepartmentLeadPolicy } from '../../../domain/policies/DepartmentLeadPolicy.js';

export class AssignManagementPositionUseCase {
  constructor({ managementPositionRepository, userRepository }) {
    this.managementPositionRepository = managementPositionRepository;
    this.userRepository = userRepository;
  }

  async assign({ userId, positionId }) {
    if (!(await this.userRepository.findById(userId))) throw AppError.notFound('User not found');
    const position = await this.managementPositionRepository.findById(positionId);
    if (!position) throw AppError.notFound('Position not found');
    if (DepartmentLeadPolicy.isLeadPosition(position)) {
      const leadIds = (await this.managementPositionRepository.getAll())
        .filter((p) => DepartmentLeadPolicy.isLeadPosition(p))
        .map((p) => p.id);
      await this.managementPositionRepository.assignExclusive(userId, positionId, leadIds, {
        soleHolder: DepartmentLeadPolicy.isSingleHolder(position),
      });
    } else {
      await this.managementPositionRepository.assign(userId, positionId);
    }
    const positions = await this.managementPositionRepository.getForUser(userId);
    return { success: true, positions };
  }

  async unassign({ userId, positionId }) {
    await this.managementPositionRepository.unassign(userId, positionId);
    const positions = await this.managementPositionRepository.getForUser(userId);
    return { success: true, positions };
  }
}
