export class ToggleUserStatusUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  execute({ userId }) {
    const user = this.userRepository.findById(userId);
    if (!user) return { success: false };
    user.toggleStatus();
    return { success: true, user };
  }
}
