import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';

export function templateRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler(async (req, res) => {
    const templates = await repositories.templateRepository.getAllForUser(req.user.id);
    res.json({ templates });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { name, snapshot } = req.body;
    const result = await useCases.saveTemplateUseCase.execute({ userId: req.user.id, name, snapshot });
    res.status(201).json(result);
  }));

  router.post('/:id/apply', asyncHandler(async (req, res) => {
    const result = await useCases.applyTemplateUseCase.execute({ userId: req.user.id, templateId: req.params.id });
    res.json(result);
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const result = await useCases.updateTemplateUseCase.execute({
      userId: req.user.id, templateId: req.params.id, changes: req.body,
    });
    res.json(result);
  }));

  router.post('/:id/duplicate', asyncHandler(async (req, res) => {
    const result = await useCases.duplicateTemplateUseCase.execute({ userId: req.user.id, templateId: req.params.id });
    res.status(201).json(result);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const result = await useCases.deleteTemplateUseCase.execute({ userId: req.user.id, templateId: req.params.id });
    res.json(result);
  }));

  return router;
}
