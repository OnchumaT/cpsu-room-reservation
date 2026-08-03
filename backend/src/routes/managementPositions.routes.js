import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

export function managementPositionRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler(async (req, res) => {
    const positions = await repositories.managementPositionRepository.getAll();
    res.json({ positions });
  }));

  router.get('/users/:userId', asyncHandler(async (req, res) => {
    const positions = await repositories.managementPositionRepository.getForUser(req.params.userId);
    res.json({ positions });
  }));

  router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
    const position = await repositories.managementPositionRepository.add(req.body);
    res.status(201).json({ position });
  }));

  router.post('/assign', authorize('admin'), asyncHandler(async (req, res) => {
    const result = await useCases.assignManagementPositionUseCase.assign(req.body);
    res.status(201).json(result);
  }));

  router.post('/unassign', authorize('admin'), asyncHandler(async (req, res) => {
    const result = await useCases.assignManagementPositionUseCase.unassign(req.body);
    res.json(result);
  }));

  return router;
}
