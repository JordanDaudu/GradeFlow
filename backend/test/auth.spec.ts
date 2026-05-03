import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ADMIN, closeTestContext, getTestContext, type TestContext } from './setup';

describe('Auth routes', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await getTestContext();
  });

  afterAll(async () => {
    await closeTestContext();
  });

  it('POST /api/auth/login returns user + sets cookie on success', async () => {
    const res = await ctx.api()
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: ADMIN.password })
      .expect(200);
    expect(res.body).toMatchObject({ email: ADMIN.email, role: 'admin' });
    expect(res.body.id).toBeTypeOf('number');
    const cookies = res.headers['set-cookie'];
    const arr = Array.isArray(cookies) ? cookies : [cookies as unknown as string];
    expect(arr.some((c) => typeof c === 'string' && c.startsWith('gradeflow_token='))).toBe(true);
  });

  it('POST /api/auth/login returns 401 with Hebrew error on bad password', async () => {
    const res = await ctx.api()
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: 'wrong-password' })
      .expect(401);
    expect(res.body.error).toMatch(/שם משתמש או סיסמה שגויים/);
  });

  it('POST /api/auth/login returns 401 for unknown email', async () => {
    const res = await ctx.api()
      .post('/api/auth/login')
      .send({ email: 'no-such-user@example.com', password: 'anything' })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/login returns 400 with Hebrew error when fields missing', async () => {
    const res = await ctx.api()
      .post('/api/auth/login')
      .send({ email: '' })
      .expect(400);
    expect(res.body.error).toMatch(/אימייל וסיסמה נדרשים/);
  });

  it('GET /api/auth/me requires auth and returns current user when authenticated', async () => {
    await ctx.api().get('/api/auth/me').expect(401);

    const res = await ctx.api()
      .get('/api/auth/me')
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(res.body).toMatchObject({ email: ADMIN.email, role: 'admin' });
  });

  it('GET /api/auth/me also accepts Authorization: Bearer', async () => {
    const res = await ctx.api()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ctx.authToken}`)
      .expect(200);
    expect(res.body.email).toBe(ADMIN.email);
  });

  it('POST /api/auth/logout clears the cookie', async () => {
    const res = await ctx.api().post('/api/auth/logout').expect(200);
    expect(res.body).toEqual({ ok: true });
    const cookies = res.headers['set-cookie'];
    const arr = Array.isArray(cookies) ? cookies : [cookies as unknown as string];
    expect(arr.some((c) => typeof c === 'string' && /gradeflow_token=;/.test(c))).toBe(true);
  });
});
