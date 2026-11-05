import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';

const credentials = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(15)
    .max(128)
    .refine(
      (value) =>
        !['passwordpassword', 'password123456', 'qwerty123456789'].includes(value.toLowerCase())
    )
});

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return next(new AppError(400, 'INVALID_INPUT', 'Request validation failed'));
    req.validated = result.data;
    next();
  };
}

function regenerate(req) {
  return new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve()))
  );
}

function destroy(req) {
  return new Promise((resolve, reject) =>
    req.session.destroy((error) => (error ? reject(error) : resolve()))
  );
}

export function createAuthRouter(
  authService,
  { loginLimit = 5, loginWindowMs = 15 * 60 * 1000 } = {}
) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: loginWindowMs,
    limit: loginLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, res) =>
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many login attempts; try again later' }
      })
  });

  router.post('/register', validate(credentials), async (req, res, next) => {
    try {
      const user = await authService.register(req.validated);
      await regenerate(req);
      req.session.user = { id: user.id, email: user.email, role: user.role };
      res.status(201).json({ user: req.session.user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', limiter, validate(credentials), async (req, res, next) => {
    try {
      const user = await authService.authenticate(req.validated);
      await regenerate(req);
      req.session.user = { id: user.id, email: user.email, role: user.role };
      res.json({ user: req.session.user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      await destroy(req);
      res.clearCookie('secureguard.sid', {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.app.get('env') === 'production',
        path: '/'
      });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
