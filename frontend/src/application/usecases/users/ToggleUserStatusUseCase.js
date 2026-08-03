export class ToggleUserStatusUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId }) {
    const user = await this.userRepository.toggleStatus(userId);
    return { success: true, user };
  }
}
