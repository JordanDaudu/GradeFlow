import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closeTestContext, getTestContext, type TestContext } from './setup';

describe('Dashboard routes', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await getTestContext();
  });

  afterAll(async () => {
    await closeTestContext();
  });

  it('GET /api/dashboard/summary requires auth', async () => {
    await ctx.api().get('/api/dashboard/summary').expect(401);
  });

  it('GET /api/dashboard/summary returns expected shape', async () => {
    const res = await ctx.api()
      .get('/api/dashboard/summary')
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(res.body).toMatchObject({
      totalCourses: expect.any(Number),
      activeCourses: expect.any(Number),
      totalStudents: expect.any(Number),
      totalAssignments: expect.any(Number),
      pendingGrading: expect.any(Number),
      gradedThisWeek: expect.any(Number),
      originalityFlagged: expect.any(Number),
      lateSubmissions: expect.any(Number),
      statusBreakdown: {
        pending: expect.any(Number),
        in_progress: expect.any(Number),
        needs_review: expect.any(Number),
        graded: expect.any(Number),
        returned: expect.any(Number),
        missing: expect.any(Number),
      },
    });
    expect(res.body.totalCourses).toBeGreaterThanOrEqual(0);
    expect(res.body.activeCourses).toBeLessThanOrEqual(res.body.totalCourses);
  });

  it('GET /api/dashboard/recent-submissions returns an array of <=15 entries', async () => {
    const res = await ctx.api()
      .get('/api/dashboard/recent-submissions')
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(15);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('status');
      expect(res.body[0]).toHaveProperty('studentName');
      expect(res.body[0]).toHaveProperty('assignmentName');
      expect(res.body[0]).toHaveProperty('courseName');
    }
  });
});
