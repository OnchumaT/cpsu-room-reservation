import { AppError } from '../utils/AppError.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

// In-memory and per-process: enough for a single API instance. Counts every attempt,
// so a successful login still uses up one slot.
export function loginRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    attempts.set(key, { start: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return next(AppError.tooManyRequests('ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'));
  }
  return next();
}

export function resetLoginRateLimitForTests() {
  attempts.clear();
}
