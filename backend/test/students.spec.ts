import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeTestContext, getTestContext, unique, type TestContext } from './setup';

describe('Students API', () => {
  let ctx: TestContext;
  const createdStudentIds: number[] = [];

  beforeAll(async () => {
    ctx = await getTestContext();
  });

  afterAll(async () => {
    for (const id of createdStudentIds) {
      await ctx.prisma.student.deleteMany({ where: { id } }).catch(() => {});
    }
    await closeTestContext();
  });

  it('GET /api/students requires auth', async () => {
    await ctx.api().get('/api/students').expect(401);
  });

  it('POST /api/students requires auth', async () => {
    await ctx.api()
      .post('/api/students')
      .send({ externalId: 'X', firstName: 'א', lastName: 'ב' })
      .expect(401);
  });

  it('full CRUD lifecycle: create → list → get → patch → delete', async () => {
    const externalId = unique('STU');
    const firstName = 'ישראל';
    const lastName = unique('ישראלי');

    // Create
    const createRes = await ctx.api()
      .post('/api/students')
      .set('Cookie', ctx.authCookie)
      .send({ externalId, firstName, lastName })
      .expect(201);
    expect(createRes.body).toMatchObject({ externalId, firstName, lastName });
    const id = createRes.body.id as number;
    createdStudentIds.push(id);

    // List — student appears in full list
    const listRes = await ctx.api()
      .get('/api/students')
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((s: { id: number }) => s.id === id)).toBeDefined();

    // List with search query
    const searchRes = await ctx.api()
      .get(`/api/students?q=${encodeURIComponent(lastName)}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(searchRes.body.find((s: { id: number }) => s.id === id)).toBeDefined();

    // Get one
    const getRes = await ctx.api()
      .get(`/api/students/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(getRes.body.externalId).toBe(externalId);
    expect(getRes.body.firstName).toBe(firstName);

    // Patch — update first name
    const newFirstName = unique('שם');
    const patchRes = await ctx.api()
      .patch(`/api/students/${id}`)
      .set('Cookie', ctx.authCookie)
      .send({ firstName: newFirstName })
      .expect(200);
    expect(patchRes.body.firstName).toBe(newFirstName);
    expect(patchRes.body.lastName).toBe(lastName);

    // History endpoint — returns { student, items, summary }
    const historyRes = await ctx.api()
      .get(`/api/students/${id}/history`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(historyRes.body.student).toBeDefined();
    expect(Array.isArray(historyRes.body.items)).toBe(true);
    expect(historyRes.body.summary).toBeDefined();

    // Delete
    await ctx.api()
      .delete(`/api/students/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    createdStudentIds.splice(createdStudentIds.indexOf(id), 1);

    // After delete: 404
    await ctx.api()
      .get(`/api/students/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(404);
  });

  it('history endpoint requires auth', async () => {
    const s = await ctx.prisma.student.create({
      data: { externalId: unique('HIS'), firstName: 'בודק', lastName: 'היסטוריה' },
    });
    createdStudentIds.push(s.id);
    await ctx.api().get(`/api/students/${s.id}/history`).expect(401);
  });

  it('rejects create with missing required fields (400)', async () => {
    const res = await ctx.api()
      .post('/api/students')
      .set('Cookie', ctx.authCookie)
      .send({ externalId: '', firstName: '', lastName: '' })
      .expect(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 404 for non-existent student', async () => {
    await ctx.api()
      .get('/api/students/999999999')
      .set('Cookie', ctx.authCookie)
      .expect(404);
  });
});
