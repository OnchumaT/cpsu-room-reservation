import { User } from '../../../domain/entities/User.js';

export class CreateUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  execute({ name, email, role }) {
    if (!name || !name.trim() || !email || !email.trim()) {
      return { success: false, reason: 'missing-fields' };
    }
    const id = `U00${this.userRepository.getAll().length + 1}`;
    const user = new User({
      id, name: name.trim(), email: email.trim(), role,
      status: 'active', joined: new Date().toISOString().slice(0, 10),
    });
    this.userRepository.add(user);
    return { success: true, user };
  }
}
