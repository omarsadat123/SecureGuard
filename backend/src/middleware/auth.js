import { AppError } from '../lib/errors.js';

export function requireAuth(req, _res, next) {
  if (!req.session?.user)
    return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required'));
  next();
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (!req.session?.user)
      return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required'));
    if (req.session.user.role !== role)
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    next();
  };
}
