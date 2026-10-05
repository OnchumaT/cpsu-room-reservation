import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { runDryRun } from '../sync/dryRun.js';
import { runSync } from '../sync/runSync.js';
import { readState } from '../sync/syncState.js';

export function syncRoutes() {
  const router = Router();
  router.use(authenticate, authorize('admin'));

  router.post('/dry-run', asyncHandler(async (req, res) => {
    res.json(await runDryRun());
  }));

  router.get('/status', asyncHandler(async (req, res) => {
    res.json(await readState());
  }));

  router.post('/run', asyncHandler(async (req, res) => {
    if (req.body?.confirm !== true) throw AppError.badRequest('Set confirm: true to run the sync');
    res.json(await runSync());
  }));

  return router;
}
