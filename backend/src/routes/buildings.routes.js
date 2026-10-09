import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Admin-managed list of buildings, used by the room form (assign a room to
// a building) and the room search/booking flow (pick a building before a
// room). Read is open to any authenticated user — the booking form needs
// the list too; writes are admin/staff-only, same gating as rooms.
export function buildingRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler(async (req, res) => {
    const buildings = await repositories.buildingRepository.getAll();
    res.json({ buildings });
  }));

  router.post('/', authorize('admin', 'staff'), asyncHandler(async (req, res) => {
    const result = await useCases.createBuildingUseCase.execute(req.body);
    res.status(201).json(result);
  }));

  router.delete('/:id', authorize('admin', 'staff'), asyncHandler(async (req, res) => {
    const result = await useCases.deleteBuildingUseCase.execute({ id: req.params.id });
    res.json(result);
  }));

  return router;
}
