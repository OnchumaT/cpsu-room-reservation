export class UpdateUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId, name, role }) {
    const user = await this.userRepository.update(userId, { name, role });
    return { success: true, user };
  }
}
