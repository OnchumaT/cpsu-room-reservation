import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

export function auditLogRoutes({ repositories }) {
  const router = Router();
  router.use(authenticate, authorize('admin'));

  router.get('/', asyncHandler(async (req, res) => {
    const logs = await repositories.auditLogRepository.getAll({
      userId: req.query.userId, action: req.query.action, month: req.query.month,
    });
    res.json({ logs });
  }));

  return router;
}
