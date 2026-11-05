import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app.js';
import { MemoryUserRepository } from '../src/repositories/userRepository.js';
import { AuthService } from '../src/services/authService.js';

const valid = { email: 'student@example.com', password: 'Correct Horse!234' };

function setup(seed = [], authOptions = {}) {
  const users = new MemoryUserRepository(seed);
  const app = createApp({
    config: { NODE_ENV: 'test', FRONTEND_ORIGIN: 'http://localhost:5173' },
    authService: new AuthService(users),
    authOptions
  });
  return { app, users };
}

describe('authentication and authorization', () => {
  test('registers a user and hashes the password', async () => {
    const { app, users } = setup();
    const response = await request(app).post('/api/auth/register').send(valid).expect(201);
    expect(response.body.user).toMatchObject({ email: valid.email, role: 'USER' });
    expect(users.users[0].passwordHash).not.toBe(valid.password);
    expect(await bcrypt.compare(valid.password, users.users[0].passwordHash)).toBe(true);
  });

  test('rejects duplicate registration without exposing details', async () => {
    const { app } = setup();
    await request(app).post('/api/auth/register').send(valid).expect(201);
    const response = await request(app).post('/api/auth/register').send(valid).expect(409);
    expect(response.body.error.code).toBe('ACCOUNT_EXISTS');
  });

  test('rejects invalid login with a generic error', async () => {
    const passwordHash = await bcrypt.hash(valid.password, 4);
    const { app } = setup([{ id: 'u1', email: valid.email, passwordHash, role: 'USER' }]);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ ...valid, password: 'Wrong Password!234' })
      .expect(401);
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  test('logs in successfully and rotates into an authenticated session', async () => {
    const passwordHash = await bcrypt.hash(valid.password, 4);
    const { app } = setup([{ id: 'u1', email: valid.email, passwordHash, role: 'USER' }]);
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send(valid).expect(200);
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    await agent
      .get('/api/me')
      .expect(200, { user: { id: 'u1', email: valid.email, role: 'USER' } });
  });

  test('blocks unauthenticated access', async () => {
    await request(setup().app).get('/api/me').expect(401);
  });

  test('enforces role-based access', async () => {
    const passwordHash = await bcrypt.hash(valid.password, 4);
    const { app } = setup([{ id: 'u1', email: valid.email, passwordHash, role: 'USER' }]);
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send(valid).expect(200);
    await agent.get('/api/admin').expect(403);
  });

  test('allows an administrator through role protection', async () => {
    const passwordHash = await bcrypt.hash(valid.password, 4);
    const { app } = setup([{ id: 'a1', email: valid.email, passwordHash, role: 'ADMIN' }]);
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send(valid).expect(200);
    await agent.get('/api/admin').expect(200);
  });

  test('logout invalidates the session', async () => {
    const passwordHash = await bcrypt.hash(valid.password, 4);
    const { app } = setup([{ id: 'u1', email: valid.email, passwordHash, role: 'USER' }]);
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send(valid).expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/me').expect(401);
  });

  test('rate limits repeated failed logins', async () => {
    const { app } = setup([], { loginLimit: 2, loginWindowMs: 60000 });
    await request(app).post('/api/auth/login').send(valid).expect(401);
    await request(app).post('/api/auth/login').send(valid).expect(401);
    const response = await request(app).post('/api/auth/login').send(valid).expect(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });

  test('health check reports status', async () => {
    await request(setup().app).get('/api/health').expect(200, { status: 'ok' });
  });
});
