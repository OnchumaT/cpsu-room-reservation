import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Staff-managed calendar of Thai public holidays — the source of truth
// OfficeHoursPolicy uses to decide whether a booking needs manual
// (department: head/vice-head) approval. Read is open to any authenticated
// user (the booking form may want to show an "out-of-hours" hint); writes
// are staff's job (admin kept as a fallback, same gating as rooms/equipment).
export function holidayRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler(async (req, res) => {
    const holidays = await repositories.holidayRepository.getAll();
    res.json({ holidays });
  }));

  router.post('/', authorize('staff', 'admin'), asyncHandler(async (req, res) => {
    const result = await useCases.createHolidayUseCase.execute(req.body);
    res.status(201).json(result);
  }));

  // CSV upload (sent as text): { csv, dryRun } — dryRun previews without saving.
  router.post('/import', authorize('staff', 'admin'), asyncHandler(async (req, res) => {
    const result = await useCases.importHolidaysUseCase.execute({ csv: req.body?.csv, dryRun: req.body?.dryRun === true });
    res.json(result);
  }));

  router.delete('/:id', authorize('staff', 'admin'), asyncHandler(async (req, res) => {
    const result = await useCases.deleteHolidayUseCase.execute({ id: req.params.id });
    res.json(result);
  }));

  return router;
}
