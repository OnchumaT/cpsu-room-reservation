import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize, requireCanApprove } from '../middleware/auth.js';

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

  // Admin-only (SettingsView, not the can_approve-gated ApprovalSettingsView).
  router.patch('/advance-days', authorize('admin'), asyncHandler(async (req, res) => {
    const result = await useCases.setMaxAdvanceDaysUseCase.execute({ days: req.body.days, updatedBy: req.user.id });
    res.json(result);
  }));

  router.patch('/retention-days', authorize('admin'), asyncHandler(async (req, res) => {
    const result = await useCases.setRetentionDaysUseCase.execute({ days: req.body.days, updatedBy: req.user.id });
    res.json(result);
  }));

  router.post('/archive-bookings', authorize('admin'), asyncHandler(async (req, res) => {
    const result = await useCases.archiveOldBookingsUseCase.execute({ triggeredBy: req.user.id });
    res.json(result);
  }));

  return router;
}
