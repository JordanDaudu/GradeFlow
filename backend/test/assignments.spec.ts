import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeTestContext, getTestContext, unique, type TestContext } from './setup';

describe('Assignments API', () => {
  let ctx: TestContext;
  let courseId: number;
  const createdAssignmentIds: number[] = [];

  beforeAll(async () => {
    ctx = await getTestContext();
    const course = await ctx.prisma.course.create({
      data: { code: unique('ASN'), name: 'קורס מטלות בדיקה', term: 'קיץ', year: 2099 },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    for (const id of createdAssignmentIds) {
      await ctx.prisma.assignment.deleteMany({ where: { id } }).catch(() => {});
    }
    await ctx.prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    await closeTestContext();
  });

  it('GET /api/assignments requires auth', async () => {
    await ctx.api().get('/api/assignments').expect(401);
  });

  it('POST /api/assignments requires auth', async () => {
    await ctx.api()
      .post('/api/assignments')
      .send({ courseId, name: 'מטלה', maxScore: 100, weight: 1 })
      .expect(401);
  });

  it('full CRUD lifecycle: create → list → get → patch → delete', async () => {
    const name = unique('מטלת-בדיקה');

    // Create
    const createRes = await ctx.api()
      .post('/api/assignments')
      .set('Cookie', ctx.authCookie)
      .send({ courseId, name, maxScore: 100, weight: 10 })
      .expect(201);
    expect(createRes.body).toMatchObject({
      courseId,
      name,
      maxScore: 100,
      weight: 10,
      closed: false,
    });
    const id = createRes.body.id as number;
    createdAssignmentIds.push(id);

    // List — appears in full list
    const listRes = await ctx.api()
      .get('/api/assignments')
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((a: { id: number }) => a.id === id)).toBeDefined();

    // List filtered by courseId
    const filteredRes = await ctx.api()
      .get(`/api/assignments?courseId=${courseId}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(filteredRes.body.find((a: { id: number }) => a.id === id)).toBeDefined();

    // Get one
    const getRes = await ctx.api()
      .get(`/api/assignments/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(getRes.body.name).toBe(name);
    expect(getRes.body.courseId).toBe(courseId);

    // Patch
    const updatedName = unique('מטלה-מעודכנת');
    const patchRes = await ctx.api()
      .patch(`/api/assignments/${id}`)
      .set('Cookie', ctx.authCookie)
      .send({ name: updatedName, maxScore: 80 })
      .expect(200);
    expect(patchRes.body.name).toBe(updatedName);
    expect(patchRes.body.maxScore).toBe(80);

    // Delete
    await ctx.api()
      .delete(`/api/assignments/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    createdAssignmentIds.splice(createdAssignmentIds.indexOf(id), 1);

    // After delete: 404
    await ctx.api()
      .get(`/api/assignments/${id}`)
      .set('Cookie', ctx.authCookie)
      .expect(404);
  });

  it('close and reopen assignment', async () => {
    const createRes = await ctx.api()
      .post('/api/assignments')
      .set('Cookie', ctx.authCookie)
      .send({ courseId, name: unique('מטלה-לסגירה'), maxScore: 100, weight: 5 })
      .expect(201);
    const id = createRes.body.id as number;
    createdAssignmentIds.push(id);

    // Close (POST → 201 by default in NestJS)
    const closeRes = await ctx.api()
      .post(`/api/assignments/${id}/close`)
      .set('Cookie', ctx.authCookie)
      .expect(201);
    expect(closeRes.body.closed).toBe(true);

    // Reopen
    const reopenRes = await ctx.api()
      .post(`/api/assignments/${id}/reopen`)
      .set('Cookie', ctx.authCookie)
      .expect(201);
    expect(reopenRes.body.closed).toBe(false);
  });

  it('rejects create with missing required fields (400)', async () => {
    const res = await ctx.api()
      .post('/api/assignments')
      .set('Cookie', ctx.authCookie)
      .send({ name: '' })
      .expect(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 404 for non-existent assignment', async () => {
    await ctx.api()
      .get('/api/assignments/999999999')
      .set('Cookie', ctx.authCookie)
      .expect(404);
  });
});
