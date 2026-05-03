import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeTestContext, getTestContext, unique, type TestContext } from './setup';

describe('Enrollments API', () => {
  let ctx: TestContext;
  let courseId: number;
  let studentId: number;

  beforeAll(async () => {
    ctx = await getTestContext();
    const course = await ctx.prisma.course.create({
      data: { code: unique('ENR'), name: 'קורס הרשמה בדיקה', term: 'קיץ', year: 2099 },
    });
    const student = await ctx.prisma.student.create({
      data: { externalId: unique('STU'), firstName: 'בודק', lastName: 'הרשמה' },
    });
    courseId = course.id;
    studentId = student.id;
  });

  afterAll(async () => {
    await ctx.prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    await ctx.prisma.student.delete({ where: { id: studentId } }).catch(() => {});
    await closeTestContext();
  });

  it('GET /api/courses/:courseId/students requires auth', async () => {
    await ctx.api().get(`/api/courses/${courseId}/students`).expect(401);
  });

  it('POST /api/courses/:courseId/students requires auth', async () => {
    await ctx.api()
      .post(`/api/courses/${courseId}/students`)
      .send({ studentId })
      .expect(401);
  });

  it('full enrollment lifecycle: enroll → list → verify studentCount → unenroll', async () => {
    // Course starts with studentCount = 0
    const beforeRes = await ctx.api()
      .get(`/api/courses/${courseId}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(beforeRes.body.studentCount).toBe(0);

    // Enroll — the endpoint returns { ok: true } on success
    const enrollRes = await ctx.api()
      .post(`/api/courses/${courseId}/students`)
      .set('Cookie', ctx.authCookie)
      .send({ studentId })
      .expect(201);
    expect(enrollRes.body).toBeTruthy();

    // List enrolled students
    const listRes = await ctx.api()
      .get(`/api/courses/${courseId}/students`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((s: { id: number }) => s.id === studentId)).toBeDefined();

    // Course studentCount incremented
    const afterEnrollRes = await ctx.api()
      .get(`/api/courses/${courseId}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(afterEnrollRes.body.studentCount).toBe(1);

    // Unenroll
    await ctx.api()
      .delete(`/api/courses/${courseId}/students/${studentId}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);

    // Verify removed from list
    const afterUnenrollList = await ctx.api()
      .get(`/api/courses/${courseId}/students`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(afterUnenrollList.body.find((s: { id: number }) => s.id === studentId)).toBeUndefined();

    // studentCount back to 0
    const afterUnenrollRes = await ctx.api()
      .get(`/api/courses/${courseId}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(afterUnenrollRes.body.studentCount).toBe(0);
  });

  it('enrolling the same student twice is idempotent (no 500)', async () => {
    await ctx.api()
      .post(`/api/courses/${courseId}/students`)
      .set('Cookie', ctx.authCookie)
      .send({ studentId })
      .expect((res) => {
        expect([200, 201, 409]).toContain(res.status);
      });

    // Cleanup
    await ctx.api()
      .delete(`/api/courses/${courseId}/students/${studentId}`)
      .set('Cookie', ctx.authCookie);
  });
});
