import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';

const records = [{ id: '1', ownerId: 'alice', note: 'Private assessment' }];
const users = [{ email: 'student@example.com', password: 'LabPass!234' }];
const escapeHtml = (value) =>
  value.replace(
    /[&<>'"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]
  );

export function createLabApp({ vulnerable = false, loginLimit = 3 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(
    session({
      secret: 'isolated-lab-secret-not-for-production-use',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'strict', secure: false, maxAge: 15 * 60 * 1000 }
    })
  );
  app.use((req, _res, next) => {
    req.session.userId ??= req.get('x-lab-user') || 'alice';
    next();
  });

  app.get('/health', (_req, res) => res.json({ status: 'isolated' }));

  app.post('/secure/sql-login', (req, res) => {
    const user = users.find(
      (item) => item.email === req.body.email && item.password === req.body.password
    );
    res
      .status(user ? 200 : 401)
      .json({ authenticated: Boolean(user), method: 'parameterized-equivalent comparison' });
  });
  app.get('/secure/xss', helmet(), (req, res) =>
    res.type('html').send(`<p>${escapeHtml(String(req.query.message ?? ''))}</p>`)
  );
  app.get('/secure/records/:id', (req, res) => {
    const record = records.find(
      (item) => item.id === req.params.id && item.ownerId === req.session.userId
    );
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record);
  });
  app.get('/secure/session', (_req, res) => res.json({ hardened: true }));
  const limiter = rateLimit({ windowMs: 60000, limit: loginLimit, legacyHeaders: false });
  app.post('/secure/login', limiter, (_req, res) =>
    res.status(401).json({ error: 'Invalid credentials' })
  );

  if (vulnerable) {
    app.post('/vulnerable/sql-login', (req, res) => {
      const query = `SELECT * FROM users WHERE email = '${req.body.email}' AND password = '${req.body.password}'`;
      const injectionSucceeded = /'\s*OR\s*['\d]+\s*=\s*['\d]+/i.test(req.body.email);
      res.json({ authenticated: injectionSucceeded, demonstrationQuery: query });
    });
    app.get('/vulnerable/xss', (req, res) =>
      res.type('html').send(`<p>${String(req.query.message ?? '')}</p>`)
    );
    app.get('/vulnerable/records/:id', (req, res) => {
      const record = records.find((item) => item.id === req.params.id);
      res.status(record ? 200 : 404).json(record ?? { error: 'Not found' });
    });
    app.get('/vulnerable/session', (_req, res) => {
      res.cookie('lab.sid', 'predictable-demo-value', {
        httpOnly: false,
        sameSite: false,
        secure: false
      });
      res.json({ hardened: false });
    });
    app.post('/vulnerable/login', (_req, res) =>
      res.status(401).json({ error: 'Invalid credentials' })
    );
  }

  return app;
}
