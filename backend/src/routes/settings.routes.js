import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, requireCanApprove } from '../middleware/auth.js';

export function settingsRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  router.get('/approval', asyncHandler(async (req, res) => {
    const setting = await repositories.bookingSettingRepository.get();
    res.json({ setting });
  }));

  router.patch('/approval', requireCanApprove(repositories), asyncHandler(async (req, res) => {
    const result = await useCases.setApprovalModeUseCase.execute({ mode: req.body.mode, updatedBy: req.user.id });
    res.json(result);
  }));

  return router;
}
