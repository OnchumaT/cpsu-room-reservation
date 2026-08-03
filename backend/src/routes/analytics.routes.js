import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

export function analyticsRoutes({ useCases }) {
  const router = Router();
  router.use(authenticate, authorize('admin'));

  router.get('/', asyncHandler(async (req, res) => {
    const analytics = await useCases.getAnalyticsUseCase.execute();
    res.json({ analytics });
  }));

  return router;
}
