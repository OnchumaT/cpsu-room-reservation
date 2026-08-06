import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { authenticate } from '../middleware/auth.js';

export function notificationRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  // Own role's inbox by default; ?scope=approvers returns the shared
  // approvers inbox instead (gated on actually holding a can_approve
  // position) — the frontend fetches both when the user has one, and
  // merges them into a single "approvals" section above their own.
  router.get('/', asyncHandler(async (req, res) => {
    if (req.query.scope === 'approvers') {
      const allowed = await repositories.userRepository.canApprove(req.user.id);
      if (!allowed) throw AppError.forbidden('Requires a management position with approval authority');
      const notifications = await repositories.notificationRepository.getByAudience('approvers');
      return res.json({ notifications });
    }
    // 'pending' (a Google self-signup with no role yet) isn't a real
    // NotificationAudience — it has no role inbox, but can still have
    // personal notifications (see below).
    const [audienceNotifications, personalNotifications] = await Promise.all([
      req.user.role === 'pending' ? [] : repositories.notificationRepository.getByAudience(req.user.role),
      repositories.notificationRepository.getByUserId(req.user.id),
    ]);
    const notifications = [...audienceNotifications, ...personalNotifications]
      .sort((a, b) => new Date(b.time) - new Date(a.time));
    res.json({ notifications });
  }));

  router.post('/:id/action', asyncHandler(async (req, res) => {
    const result = await useCases.updateNotificationUseCase.execute({
      notificationId: req.params.id, action: req.body.action,
    });
    res.json(result);
  }));

  return router;
}
