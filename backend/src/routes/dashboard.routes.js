import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';

export function dashboardRoutes({ useCases }) {
  const router = Router();
  router.use(authenticate);

  router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await useCases.getDashboardStatsUseCase.execute({ actor: req.user });
    res.json({ stats });
  }));

  return router;
}
