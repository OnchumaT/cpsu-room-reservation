import { AppError } from '../../../utils/AppError.js';
import { VALID_ROLES } from '../../../utils/roles.js';

const STUDENT_EMAIL_DOMAIN = '@su.ac.th';

export class CreateUserUseCase {
  constructor({ userRepository, authService }) {
    this.userRepository = userRepository;
    this.authService = authService;
  }

  async execute({ name, email, role, password }) {
    if (!name?.trim() || !email?.trim() || !password) {
      throw AppError.badRequest('name, email and password are required');
    }
    if (!VALID_ROLES.has(role)) throw AppError.badRequest(`Invalid role: ${role}`);
    const trimmedEmail = email.trim();
    if (role === 'student' && !trimmedEmail.toLowerCase().endsWith(STUDENT_EMAIL_DOMAIN)) {
      throw AppError.badRequest(`Student accounts require a ${STUDENT_EMAIL_DOMAIN} email address`);
    }
    if (await this.userRepository.findByEmail(trimmedEmail)) {
      throw AppError.conflict(`A user with email ${email} already exists`);
    }

    const hashed = await this.authService.hashPassword(password);
    const user = await this.userRepository.add({ name: name.trim(), email: trimmedEmail, role, password: hashed });
    return { success: true, user };
  }
}
