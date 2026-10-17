import { AppError } from '../utils/AppError.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
const attempts = new Map();

// In-memory and per-process: enough for a single API instance. Counts failed
// logins only — a successful login clears the count for that IP, so people
// logging in and out (or testers switching accounts) never lock themselves
// out; only repeated wrong passwords do.
export function loginRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  let entry = attempts.get(key);
  if (entry && now - entry.start > WINDOW_MS) {
    attempts.delete(key);
    entry = null;
  }
  if (entry && entry.count >= MAX_FAILED_ATTEMPTS) {
    const minutesLeft = Math.ceil((entry.start + WINDOW_MS - now) / 60000);
    return next(AppError.tooManyRequests(`ใส่รหัสผ่านผิดบ่อยเกินไป กรุณารอประมาณ ${minutesLeft} นาทีแล้วลองใหม่`));
  }

  res.on('finish', () => {
    if (res.statusCode < 400) { attempts.delete(key); return; }
    if (res.statusCode !== 401) return; // only a wrong email/password counts
    const current = attempts.get(key);
    if (!current || Date.now() - current.start > WINDOW_MS) attempts.set(key, { start: Date.now(), count: 1 });
    else current.count += 1;
  });
  return next();
}

export function resetLoginRateLimitForTests() {
  attempts.clear();
}
