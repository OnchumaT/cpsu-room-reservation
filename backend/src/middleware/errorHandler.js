import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `No route: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }

  if (err?.code === 'P2002') {
    return res.status(409).json({ error: { message: 'A record with that value already exists', details: err.meta } });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: { message: 'Record not found' } });
  }

  console.error(err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
}
