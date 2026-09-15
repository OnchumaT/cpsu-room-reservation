import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Admin-managed calendar of Thai public holidays — the source of truth
// OfficeHoursPolicy uses to decide whether a booking needs the 2-stage
// faculty/dean approval flow. Read is open to any authenticated user
// (the booking form may want to show an "out-of-hours" hint); writes are
// admin-only, same gating as rooms/users management.
export function holidayRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler(async (req, res) => {
    const holidays = await repositories.holidayRepository.getAll();
    res.json({ holidays });
  }));

  router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
    const result = await useCases.createHolidayUseCase.execute(req.body);
    res.status(201).json(result);
  }));

  router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
    const result = await useCases.deleteHolidayUseCase.execute({ id: req.params.id });
    res.json(result);
  }));

  return router;
}
