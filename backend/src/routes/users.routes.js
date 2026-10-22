import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

export function userRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  // Staff names (no emails) for the booking form's out-of-hours "who opens/
  // closes the room" picker — any signed-in user may read this one.
  router.get('/staff', asyncHandler(async (req, res) => {
    const staff = await repositories.userRepository.getStaff();
    res.json({ staff: staff.map((u) => ({ id: u.id, name: u.name })) });
  }));

  router.use(authorize('admin'));

  router.get('/', asyncHandler(async (req, res) => {
    const users = await repositories.userRepository.getAll();
    res.json({ users });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { name, email, role, password } = req.body;
    const result = await useCases.createUserUseCase.execute({ name, email, role, password });
    res.status(201).json(result);
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const { name, role } = req.body;
    const result = await useCases.updateUserUseCase.execute({ userId: req.params.id, name, role });
    res.json(result);
  }));

  router.patch('/:id/toggle', asyncHandler(async (req, res) => {
    const result = await useCases.toggleUserStatusUseCase.execute({ userId: req.params.id });
    res.json(result);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const result = await useCases.deleteUserUseCase.execute({ userId: req.params.id, actor: req.user });
    res.json(result);
  }));

  return router;
}
