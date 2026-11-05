import request from 'supertest';
import { createLabApp } from '../src/app.js';

describe('controlled vulnerability mitigations', () => {
  test('vulnerable demonstrations are disabled by default', async () => {
    await request(createLabApp()).get('/vulnerable/xss').expect(404);
  });

  test('SQL injection string cannot bypass secure authentication', async () => {
    const payload = { email: "' OR '1'='1", password: 'anything' };
    expect(
      (
        await request(createLabApp({ vulnerable: true }))
          .post('/vulnerable/sql-login')
          .send(payload)
      ).body.authenticated
    ).toBe(true);
    await request(createLabApp()).post('/secure/sql-login').send(payload).expect(401);
  });

  test('XSS output is encoded and protected by security headers', async () => {
    const response = await request(createLabApp())
      .get('/secure/xss')
      .query({ message: '<script>alert(1)</script>' })
      .expect(200);
    expect(response.text).not.toContain('<script>');
    expect(response.text).toContain('&lt;script&gt;');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  test('record access is scoped to the authenticated owner', async () => {
    await request(createLabApp()).get('/secure/records/1').set('x-lab-user', 'mallory').expect(404);
    await request(createLabApp()).get('/secure/records/1').set('x-lab-user', 'alice').expect(200);
  });

  test('secure session cookie has defensive attributes', async () => {
    const response = await request(createLabApp()).get('/secure/session').expect(200);
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).not.toContain('predictable-demo-value');
  });

  test('secure login is rate limited', async () => {
    const app = createLabApp({ loginLimit: 2 });
    await request(app).post('/secure/login').expect(401);
    await request(app).post('/secure/login').expect(401);
    await request(app).post('/secure/login').expect(429);
  });
});
