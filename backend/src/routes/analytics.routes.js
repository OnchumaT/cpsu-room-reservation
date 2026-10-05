import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { authenticate } from '../middleware/auth.js';

export function analyticsRoutes({ repositories, useCases }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler(async (req, res) => {
    const allowed = req.user.role === 'admin' || await repositories.userRepository.canApprove(req.user.id);
    if (!allowed) throw AppError.forbidden('Requires role: admin or a management position with approval authority');
    const analytics = await useCases.getAnalyticsUseCase.execute();
    res.json({ analytics });
  }));

  return router;
}
