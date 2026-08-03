import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 10;

export class AuthService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
    this.googleClient = new OAuth2Client(env.googleClientId || undefined);
  }

  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async login({ email, password }) {
    const authUser = await this.userRepository.findAuthByEmail(email);
    if (!authUser) throw AppError.unauthorized('Invalid email or password');
    if (!authUser.isActive) throw AppError.forbidden('Account is inactive');

    const valid = await bcrypt.compare(password, authUser.password);
    if (!valid) throw AppError.unauthorized('Invalid email or password');

    const user = await this.userRepository.findById(authUser.id);
    return { user, token: this._signToken(user) };
  }

  /**
   * Verifies a Google Sign-In ID token and logs the matching user in. If
   * no user exists with that email yet, one is created automatically with
   * role 'teacher' (this endpoint is meant for teacher self-service sign-up
   * — student/staff/admin accounts are still provisioned by an admin via
   * POST /api/users).
   */
  async loginWithGoogle({ idToken }) {
    if (!idToken) throw AppError.badRequest('idToken is required');
    if (!env.googleClientId) throw new AppError(503, 'Google login is not configured on this server (missing GOOGLE_CLIENT_ID)');

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: env.googleClientId });
      payload = ticket.getPayload();
    } catch {
      throw AppError.unauthorized('Invalid Google ID token');
    }
    if (!payload?.email) throw AppError.unauthorized('Google account has no email');
    if (!payload.email_verified) throw AppError.unauthorized('Google email is not verified');

    let authUser = await this.userRepository.findAuthByEmail(payload.email);
    if (!authUser) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const created = await this.userRepository.add({
        name: payload.name || payload.email,
        email: payload.email,
        role: 'teacher',
        password: await this.hashPassword(randomPassword),
      });
      authUser = { id: created.id, isActive: created.isActive };
    }
    if (!authUser.isActive) throw AppError.forbidden('Account is inactive');

    const user = await this.userRepository.findById(authUser.id);
    return { user, token: this._signToken(user) };
  }

  _signToken(user) {
    return jwt.sign(
      { sub: Number(user.id), role: user.role, name: user.name },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn },
    );
  }
}
