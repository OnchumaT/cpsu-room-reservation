import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    return next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(AppError.forbidden(`Requires role: ${roles.join(', ')}`));
    }
    return next();
  };
}

/**
 * RBAC gate for approve/reject actions — deliberately separate from
 * `authorize(...roles)`. Approval authority isn't a role (teacher/
 * staff/admin); it comes from holding a management position
 * with can_approve = true (user_management_positions), which any role
 * could in principle hold.
 */
export function requireCanApprove({ userRepository }) {
  return async (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    const allowed = await userRepository.canApprove(req.user.id);
    if (!allowed) {
      return next(AppError.forbidden('Requires a management position with approval authority'));
    }
    return next();
  };
}
