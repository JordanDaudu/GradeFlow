import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeTestContext, getTestContext, unique, type TestContext } from './setup';

describe('Submission ordering', () => {
  let ctx: TestContext;
  let courseId: number;
  let assignmentId: number;

  type SeedStudent = {
    externalId: string;
    firstName: string;
    lastName: string;
    id?: number;
    submissionId?: number;
  };

  // Inserted in reverse expected order so a missing orderBy would fail the test.
  // Expected order: Abrams/Aaron (0), Cohen/Aaron lower-id (1), Cohen/Aaron higher-id (2), Cohen/David (3)
  const students: SeedStudent[] = [
    { externalId: unique('ORD'), firstName: 'David', lastName: 'Cohen' },
    { externalId: unique('ORD'), firstName: 'Aaron', lastName: 'Cohen' },
    { externalId: unique('ORD'), firstName: 'Aaron', lastName: 'Cohen' },
    { externalId: unique('ORD'), firstName: 'Aaron', lastName: 'Abrams' },
  ];

  beforeAll(async () => {
    ctx = await getTestContext();

    const course = await ctx.prisma.course.create({
      data: { code: unique('ORD'), name: 'קורס סדר בדיקה', term: 'אביב', year: 2099 },
    });
    courseId = course.id;

    const assignment = await ctx.prisma.assignment.create({
      data: { courseId, name: unique('מטלת-סדר'), maxScore: 100, weight: 10 },
    });
    assignmentId = assignment.id;

    for (const s of students) {
      const student = await ctx.prisma.student.create({
        data: { externalId: s.externalId, firstName: s.firstName, lastName: s.lastName },
      });
      s.id = student.id;
      const sub = await ctx.prisma.submission.create({
        data: { assignmentId, studentId: student.id, status: 'pending' },
      });
      s.submissionId = sub.id;
    }
  });

  afterAll(async () => {
    await ctx.prisma.submission.deleteMany({ where: { assignmentId } }).catch(() => {});
    await ctx.prisma.assignment.deleteMany({ where: { id: assignmentId } }).catch(() => {});
    for (const s of students) {
      if (s.id) await ctx.prisma.student.deleteMany({ where: { id: s.id } }).catch(() => {});
    }
    await ctx.prisma.course.deleteMany({ where: { id: courseId } }).catch(() => {});
    await closeTestContext();
  });

  it('GET /api/assignments/:id/submissions returns submissions sorted lastName asc → firstName asc → id asc', async () => {
    const res = await ctx
      .api()
      .get(`/api/assignments/${assignmentId}/submissions`)
      .set('Cookie', ctx.authCookie)
      .expect(200);

    const subs = res.body as Array<{ id: number; student: { firstName: string; lastName: string } }>;
    expect(subs.length).toBe(4);

    // Primary: lastName asc
    expect(subs[0].student.lastName).toBe('Abrams');
    expect(subs[1].student.lastName).toBe('Cohen');
    expect(subs[2].student.lastName).toBe('Cohen');
    expect(subs[3].student.lastName).toBe('Cohen');

    // Secondary: firstName asc within same lastName
    expect(subs[1].student.firstName).toBe('Aaron');
    expect(subs[2].student.firstName).toBe('Aaron');
    expect(subs[3].student.firstName).toBe('David');

    // Tertiary: id asc when lastName + firstName are both equal
    expect(subs[1].id).toBeLessThan(subs[2].id);
  });

  it('ordering is stable across concurrent calls', async () => {
    const [res1, res2] = await Promise.all([
      ctx.api().get(`/api/assignments/${assignmentId}/submissions`).set('Cookie', ctx.authCookie),
      ctx.api().get(`/api/assignments/${assignmentId}/submissions`).set('Cookie', ctx.authCookie),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const ids1 = (res1.body as Array<{ id: number }>).map((s) => s.id);
    const ids2 = (res2.body as Array<{ id: number }>).map((s) => s.id);
    expect(ids1).toEqual(ids2);
  });
});
