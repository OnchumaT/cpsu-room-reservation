import { loginRateLimit } from '../middleware/loginRateLimit.js';
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { authenticate } from '../middleware/auth.js';

export function authRoutes({ services, repositories }) {
  const router = Router();

  async function withPositions(user) {
    const positions = await repositories.managementPositionRepository.getForUser(user.id);
    return { ...user, managementPositions: positions };
  }

  router.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw AppError.badRequest('email and password are required');
    const { user, token } = await services.authService.login({ email, password });
    res.json({ user: await withPositions(user), token });
  }));

  router.post('/google', asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    const { user, token } = await services.authService.loginWithGoogle({ idToken });
    res.json({ user: await withPositions(user), token });
  }));

  // The signed-in user's own choice to get notification emails (Profile page).
  router.patch('/me/email-notifications', authenticate, asyncHandler(async (req, res) => {
    if (typeof req.body?.enabled !== 'boolean') throw AppError.badRequest('enabled must be true or false');
    const user = await repositories.userRepository.setEmailNotifications(req.user.id, req.body.enabled);
    res.json({ user: await withPositions(user) });
  }));

  router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const user = await repositories.userRepository.findById(req.user.id);
    if (!user) throw AppError.notFound('User not found');
    res.json({ user: await withPositions(user) });
  }));

  return router;
}
