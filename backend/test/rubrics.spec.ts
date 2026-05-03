import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closeTestContext, getTestContext, unique, type TestContext } from './setup';

interface Ids {
  courseId: number;
  studentId: number;
  assignmentId: number;
  submissionId: number;
}

describe('Rubric save flow', () => {
  let ctx: TestContext;
  let ids: Ids;

  beforeAll(async () => {
    ctx = await getTestContext();
    const course = await ctx.prisma.course.create({
      data: { code: unique('RUB'), name: 'בדיקת מחוון', term: 'קיץ', year: 2099 },
    });
    const student = await ctx.prisma.student.create({
      data: { externalId: unique('STU'), firstName: 'בודק', lastName: 'מחוון' },
    });
    await ctx.prisma.enrollment.create({
      data: { courseId: course.id, studentId: student.id },
    });
    const assignment = await ctx.prisma.assignment.create({
      data: { courseId: course.id, name: 'מטלת בדיקה', maxScore: '100', weight: '1' },
    });
    const submission = await ctx.prisma.submission.create({
      data: { assignmentId: assignment.id, studentId: student.id },
    });
    ids = {
      courseId: course.id,
      studentId: student.id,
      assignmentId: assignment.id,
      submissionId: submission.id,
    };
  });

  afterAll(async () => {
    await ctx.prisma.course.delete({ where: { id: ids.courseId } }).catch(() => {});
    await ctx.prisma.student.delete({ where: { id: ids.studentId } }).catch(() => {});
    await closeTestContext();
  });

  it('GET rubric initially empty', async () => {
    const res = await ctx.api()
      .get(`/api/assignments/${ids.assignmentId}/rubric`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('PUT rubric replaces criteria, GET returns them in order', async () => {
    const replaceRes = await ctx.api()
      .put(`/api/assignments/${ids.assignmentId}/rubric`)
      .set('Cookie', ctx.authCookie)
      .send({
        criteria: [
          { name: 'נכונות', maxPoints: 50, weight: 1, orderIndex: 0 },
          { name: 'איכות הקוד', description: 'קריאות וחלוקה', maxPoints: 30, weight: 1, orderIndex: 1 },
          { name: 'תיעוד', maxPoints: 20, orderIndex: 2 },
        ],
      })
      .expect(200);
    expect(replaceRes.body).toHaveLength(3);
    expect(replaceRes.body[0].name).toBe('נכונות');
    expect(replaceRes.body[0].maxPoints).toBe(50);
    expect(replaceRes.body[1].description).toBe('קריאות וחלוקה');

    const getRes = await ctx.api()
      .get(`/api/assignments/${ids.assignmentId}/rubric`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(getRes.body.map((c: { name: string }) => c.name)).toEqual([
      'נכונות',
      'איכות הקוד',
      'תיעוד',
    ]);
  });

  it('PUT rubric-scores updates submission score = sum of points', async () => {
    const criteria = await ctx.prisma.rubricCriterion.findMany({
      where: { assignmentId: ids.assignmentId },
      orderBy: { orderIndex: 'asc' },
    });
    expect(criteria.length).toBe(3);

    const scoresPayload = {
      scores: [
        { criterionId: criteria[0].id, points: 45, comment: 'כמעט מושלם' },
        { criterionId: criteria[1].id, points: 25 },
        { criterionId: criteria[2].id, points: 18 },
      ],
    };
    const res = await ctx.api()
      .put(`/api/submissions/${ids.submissionId}/rubric-scores`)
      .set('Cookie', ctx.authCookie)
      .send(scoresPayload)
      .expect(200);

    expect(res.body.id).toBe(ids.submissionId);
    expect(res.body.score).toBe(88);
    expect(res.body.rubricScores).toHaveLength(3);

    const listRes = await ctx.api()
      .get(`/api/submissions/${ids.submissionId}/rubric-scores`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(listRes.body).toHaveLength(3);
    expect(listRes.body.find((s: { points: number }) => s.points === 45)).toBeDefined();
  });

  it('PUT rubric with empty array clears all criteria', async () => {
    const res = await ctx.api()
      .put(`/api/assignments/${ids.assignmentId}/rubric`)
      .set('Cookie', ctx.authCookie)
      .send({ criteria: [] })
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('PUT rubric rejects invalid payload with 400', async () => {
    const res = await ctx.api()
      .put(`/api/assignments/${ids.assignmentId}/rubric`)
      .set('Cookie', ctx.authCookie)
      .send({ criteria: [{ name: '', maxPoints: 'not-a-number' }] })
      .expect(400);
    expect(res.body.error).toBeDefined();
  });
});
