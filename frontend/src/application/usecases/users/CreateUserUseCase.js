export class CreateUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ name, email, role, password }) {
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return { success: false, reason: 'missing-fields' };
    }
    return this.userRepository.add({ name: name.trim(), email: email.trim(), role, password });
  }
}
