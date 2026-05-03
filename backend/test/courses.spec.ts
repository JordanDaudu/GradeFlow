import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closeTestContext, getTestContext, unique, type TestContext } from './setup';

describe('Courses CRUD', () => {
  let ctx: TestContext;
  const created: number[] = [];

  beforeAll(async () => {
    ctx = await getTestContext();
  });

  afterAll(async () => {
    for (const id of created) {
      await ctx.prisma.course.deleteMany({ where: { id } });
    }
    await closeTestContext();
  });

  it('GET /api/courses requires auth', async () => {
    await ctx.api().get('/api/courses').expect(401);
  });

  it('full CRUD lifecycle: create → list → update → archive → unarchive → delete', async () => {
    const code = unique('TST');
    const term = 'אביב';
    const year = 2099;

    // Create
    const createRes = await ctx.api()
      .post('/api/courses')
      .set('Cookie', ctx.authCookie)
      .send({ code, name: 'קורס בדיקה', term, year })
      .expect(201);
    expect(createRes.body).toMatchObject({
      code,
      name: 'קורס בדיקה',
      term,
      year,
      archived: false,
      studentCount: 0,
      assignmentCount: 0,
    });
    const id = createRes.body.id as number;
    created.push(id);

    // List includes the new course
    const listRes = await ctx.api()
      .get('/api/courses')
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((c: { id: number }) => c.id === id)).toBeDefined();

    // Get one
    const getRes = await ctx.api()
      .get(`/api/courses/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(getRes.body.code).toBe(code);

    // Update
    const updateRes = await ctx.api()
      .patch(`/api/courses/${id}`)
      .set('Cookie', ctx.authCookie)
      .send({ name: 'קורס מעודכן' })
      .expect(200);
    expect(updateRes.body.name).toBe('קורס מעודכן');

    // Archive
    const archRes = await ctx.api()
      .post(`/api/courses/${id}/archive`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(archRes.body.archived).toBe(true);

    // includeArchived=false should hide it
    const activeOnlyRes = await ctx.api()
      .get('/api/courses?includeArchived=false')
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(activeOnlyRes.body.find((c: { id: number }) => c.id === id)).toBeUndefined();

    // Unarchive
    const unarchRes = await ctx.api()
      .post(`/api/courses/${id}/unarchive`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(unarchRes.body.archived).toBe(false);

    // Delete
    await ctx.api()
      .delete(`/api/courses/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    created.splice(created.indexOf(id), 1);

    // After delete: 404
    await ctx.api()
      .get(`/api/courses/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(404);
  });

  it('rejects invalid create payload with 400 + Hebrew error', async () => {
    const res = await ctx.api()
      .post('/api/courses')
      .set('Cookie', ctx.authCookie)
      .send({ code: '', name: '', term: '', year: 'not-a-number' })
      .expect(400);
    expect(res.body.error).toMatch(/שדות חסרים/);
  });
});
