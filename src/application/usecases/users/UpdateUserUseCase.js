export class UpdateUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  execute({ userId, name, role }) {
    const user = this.userRepository.findById(userId);
    if (!user) return { success: false };
    this.userRepository.update(userId, {
      name: name || user.name,
      role: role || user.role,
    });
    return { success: true, user };
  }
}
