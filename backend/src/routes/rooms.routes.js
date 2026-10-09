import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { authenticate, authorize } from '../middleware/auth.js';

export function roomRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler(async (req, res) => {
    const rooms = await repositories.roomRepository.getAll({ query: req.query.q, status: req.query.status, buildingId: req.query.buildingId });
    res.json({ rooms });
  }));

  // Must be registered before the dynamic /:id route below, or Express
  // would match "available" as an id.
  router.get('/available', asyncHandler(async (req, res) => {
    const { date, start, end } = req.query;
    const rooms = await useCases.getAvailableRoomsUseCase.execute({ date, start, end });
    res.json({ rooms });
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const room = await repositories.roomRepository.findById(req.params.id);
    if (!room) throw AppError.notFound('Room not found');
    res.json({ room });
  }));

  router.post('/', authorize('admin', 'staff'), asyncHandler(async (req, res) => {
    const { id, cap, floor, status, buildingId } = req.body;
    const result = await useCases.createRoomUseCase.execute({ id, cap, floor, status, buildingId });
    res.status(201).json(result);
  }));

  router.patch('/:id', authorize('admin', 'staff'), asyncHandler(async (req, res) => {
    const { cap, floor, status, equipment, buildingId } = req.body;
    const result = await useCases.updateRoomUseCase.execute({ roomId: req.params.id, cap, floor, status, equipment, buildingId });
    res.json(result);
  }));

  router.patch('/:id/toggle', authorize('admin', 'staff'), asyncHandler(async (req, res) => {
    const result = await useCases.toggleRoomStatusUseCase.execute({ roomId: req.params.id });
    res.json(result);
  }));

  router.delete('/:id', authorize('admin', 'staff'), asyncHandler(async (req, res) => {
    const result = await useCases.deleteRoomUseCase.execute({ roomId: req.params.id });
    res.json(result);
  }));

  return router;
}
