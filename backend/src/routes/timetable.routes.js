import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { authenticate, authorize } from '../middleware/auth.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function timetableRoutes({ useCases, repositories }) {
  const router = Router();

  // Read-only and open to any signed-in user, so everyone sees the same timetable.
  router.get('/schedules', authenticate, asyncHandler(async (req, res) => {
    const { date, start, end } = req.query;
    if (start || end) {
      if (!DATE_RE.test(start ?? '') || !DATE_RE.test(end ?? '') || end < start) {
        throw AppError.badRequest('start and end are required (YYYY-MM-DD) and end must not be before start');
      }
      const days = (new Date(end) - new Date(start)) / 86400000 + 1;
      if (days > 62) throw AppError.badRequest('range must be 62 days or less');
      return res.json({ schedules: await repositories.timetableRepository.sessionsForRange(start, end) });
    }
    if (!DATE_RE.test(date ?? '')) throw AppError.badRequest('date is required (YYYY-MM-DD)');
    res.json({ schedules: await repositories.timetableRepository.sessionsForDate(date) });
  }));

  router.use(authenticate, authorize('admin'));

  router.post('/preview', asyncHandler(async (req, res) => {
    res.json(await useCases.importTimetableUseCase.preview(req.body ?? {}));
  }));

  router.post('/import', asyncHandler(async (req, res) => {
    res.json(await useCases.importTimetableUseCase.import({ actor: req.user, ...(req.body ?? {}) }));
  }));

  router.get('/imports', asyncHandler(async (req, res) => {
    res.json({ imports: await repositories.timetableRepository.history() });
  }));

  return router;
}
