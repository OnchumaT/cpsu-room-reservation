import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

export function facilityRequestRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate, authorize('staff', 'admin'));

  router.get('/', asyncHandler(async (req, res) => {
    const facilityRequests = await repositories.facilityRequestRepository.getAll({ status: req.query.status });
    res.json({ facilityRequests });
  }));

  router.post('/:id/accept', asyncHandler(async (req, res) => {
    const result = await useCases.updateFacilityRequestStatusUseCase.accept(req.params.id);
    res.json(result);
  }));

  router.post('/:id/done', asyncHandler(async (req, res) => {
    const result = await useCases.updateFacilityRequestStatusUseCase.markDone(req.params.id);
    res.json(result);
  }));

  router.post('/:id/not-done', asyncHandler(async (req, res) => {
    const result = await useCases.updateFacilityRequestStatusUseCase.markNotDone(req.params.id);
    res.json(result);
  }));

  return router;
}
