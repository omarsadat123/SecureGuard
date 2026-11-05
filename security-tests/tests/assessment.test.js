import request from 'supertest';
import { performance } from 'node:perf_hooks';
import { createLabApp } from '../../security-lab/src/app.js';

const secured = createLabApp({ loginLimit: 2 });
const vulnerable = createLabApp({ vulnerable: true });

describe('automated security assessment', () => {
  test('SQL injection: vulnerable behavior detected and secure behavior mitigated', async () => {
    const payload = { email: "' OR '1'='1", password: 'x' };
    expect(
      (await request(vulnerable).post('/vulnerable/sql-login').send(payload)).body.authenticated
    ).toBe(true);
    await request(secured).post('/secure/sql-login').send(payload).expect(401);
  });
  test('XSS: vulnerable reflection detected and secure output encoded', async () => {
    const payload = '<img src=x onerror=alert(1)>';
    expect(
      (await request(vulnerable).get('/vulnerable/xss').query({ message: payload })).text
    ).toContain(payload);
    expect(
      (await request(secured).get('/secure/xss').query({ message: payload })).text
    ).not.toContain(payload);
  });
  test('access control: vulnerable IDOR detected and owner scoping enforced', async () => {
    await request(vulnerable).get('/vulnerable/records/1').set('x-lab-user', 'mallory').expect(200);
    await request(secured).get('/secure/records/1').set('x-lab-user', 'mallory').expect(404);
  });
  test('session security: weak cookie detected and hardened cookie verified', async () => {
    expect(
      (await request(vulnerable).get('/vulnerable/session')).headers['set-cookie'].join(';')
    ).toContain('predictable-demo-value');
    const cookie = (await request(secured).get('/secure/session')).headers['set-cookie'].join(';');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });
  test('rate limiting: exposed login detected and secure endpoint bounded', async () => {
    for (let index = 0; index < 3; index += 1)
      await request(vulnerable).post('/vulnerable/login').expect(401);
    await request(secured).post('/secure/login').expect(401);
    await request(secured).post('/secure/login').expect(401);
    await request(secured).post('/secure/login').expect(429);
  });
  test('measures response-time overhead without asserting a fabricated threshold', async () => {
    const iterations = 20;
    const measure = async (app, path) => {
      const start = performance.now();
      for (let index = 0; index < iterations; index += 1)
        await request(app).get(path).query({ message: 'safe text' });
      return (performance.now() - start) / iterations;
    };
    const vulnerableMs = await measure(vulnerable, '/vulnerable/xss');
    const secureMs = await measure(secured, '/secure/xss');
    console.log(
      JSON.stringify({
        metric: 'mean_response_ms',
        iterations,
        vulnerableMs,
        secureMs,
        overheadMs: secureMs - vulnerableMs
      })
    );
    expect(Number.isFinite(secureMs)).toBe(true);
  });
});
