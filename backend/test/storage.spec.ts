import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closeTestContext, getTestContext, type TestContext } from './setup';

describe('Storage signed-upload-URL route', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await getTestContext();
  });

  afterAll(async () => {
    await closeTestContext();
  });

  it('requires auth', async () => {
    await ctx.api()
      .post('/api/storage/uploads/request-url')
      .send({ name: 'a.pdf', size: 1024, contentType: 'application/pdf' })
      .expect(401);
  });

  it('returns uploadURL + objectPath + echoed metadata', async () => {
    const res = await ctx.api()
      .post('/api/storage/uploads/request-url')
      .set('Cookie', ctx.authCookie)
      .send({ name: 'demo.pdf', size: 2048, contentType: 'application/pdf' })
      .expect(200);
    expect(res.body).toMatchObject({
      uploadURL: expect.stringMatching(/^https?:\/\//),
      objectPath: expect.stringMatching(/^\/objects\//),
      metadata: { name: 'demo.pdf', size: 2048, contentType: 'application/pdf' },
    });
  });

  it('rejects missing fields with 400', async () => {
    const res = await ctx.api()
      .post('/api/storage/uploads/request-url')
      .set('Cookie', ctx.authCookie)
      .send({ name: '', size: 'abc', contentType: '' })
      .expect(400);
    expect(res.body.error).toBeDefined();
  });
});
