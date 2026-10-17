import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Live equipment-pool counts backing the booking form's "คงเหลือ" display
// (previously hardcoded in the frontend). Read is open to any
// authenticated user — the booking/facility-request form needs it; writes
// (set total owned / mark some damaged) are staff-only — managing the
// equipment pool is staff's job, not admin's.
export function equipmentRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler(async (req, res) => {
    const equipment = await repositories.equipmentRepository.getAll();
    res.json({ equipment });
  }));

  router.patch('/:key', authorize('staff'), asyncHandler(async (req, res) => {
    const { total, damaged } = req.body;
    const result = await useCases.updateEquipmentUseCase.execute({ key: req.params.key, total, damaged });
    res.json(result);
  }));

  return router;
}
