import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

export function userRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate, authorize('admin'));

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

  return router;
}
