import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { createAuthRouter } from './routes/auth.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp({ config, authService, sessionStore, authOptions = {} }) {
  const app = express();
  app.set('env', config.NODE_ENV);
  if (config.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use(
    session({
      name: 'secureguard.sid',
      secret: config.SESSION_SECRET ?? 'test-only-secret-that-is-at-least-32-characters',
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
      }
    })
  );

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter(authService, authOptions));
  app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.session.user }));
  app.get('/api/admin', requireRole('ADMIN'), (_req, res) =>
    res.json({ message: 'Admin access granted' })
  );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
