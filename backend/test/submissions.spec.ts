import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeTestContext, getTestContext, unique, type TestContext } from './setup';

describe('Submissions API', () => {
  let ctx: TestContext;
  let courseId: number;
  let assignmentId: number;
  let studentId: number;
  let submissionId: number;

  beforeAll(async () => {
    ctx = await getTestContext();

    const course = await ctx.prisma.course.create({
      data: { code: unique('SUB'), name: 'קורס הגשות בדיקה', term: 'חורף', year: 2099 },
    });
    courseId = course.id;

    const assignment = await ctx.prisma.assignment.create({
      data: { courseId, name: unique('מטלת-הגשות'), maxScore: 100, weight: 10 },
    });
    assignmentId = assignment.id;

    const student = await ctx.prisma.student.create({
      data: {
        externalId: unique('S'),
        firstName: 'תלמיד',
        lastName: 'בדיקה',
        email: `${unique('student')}@test.com`,
      },
    });
    studentId = student.id;

    const submission = await ctx.prisma.submission.create({
      data: { assignmentId, studentId, status: 'pending' },
    });
    submissionId = submission.id;
  });

  afterAll(async () => {
    await ctx.prisma.submission.deleteMany({ where: { id: submissionId } }).catch(() => {});
    await ctx.prisma.assignment.deleteMany({ where: { id: assignmentId } }).catch(() => {});
    await ctx.prisma.student.deleteMany({ where: { id: studentId } }).catch(() => {});
    await ctx.prisma.course.deleteMany({ where: { id: courseId } }).catch(() => {});
    await closeTestContext();
  });

  it('GET /api/submissions/:id requires auth', async () => {
    await ctx.api().get(`/api/submissions/${submissionId}`).expect(401);
  });

  it('PATCH /api/submissions/:id requires auth', async () => {
    await ctx.api()
      .patch(`/api/submissions/${submissionId}`)
      .send({ score: 80 })
      .expect(401);
  });

  it('POST /api/submissions/:id/file requires auth', async () => {
    await ctx.api()
      .post(`/api/submissions/${submissionId}/file`)
      .send({ objectPath: 'a/b.pdf', fileName: 'b.pdf', contentType: 'application/pdf', fileSize: 1024 })
      .expect(401);
  });

  it('DELETE /api/submissions/:id/file requires auth', async () => {
    await ctx.api().delete(`/api/submissions/${submissionId}/file`).expect(401);
  });

  it('GET /api/submissions/:id returns the submission with student and assignment', async () => {
    const res = await ctx.api()
      .get(`/api/submissions/${submissionId}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);

    expect(res.body.id).toBe(submissionId);
    expect(res.body.assignmentId).toBe(assignmentId);
    expect(res.body.studentId).toBe(studentId);
    expect(res.body.status).toBe('pending');
    expect(res.body.score).toBeNull();
    expect(res.body.student).toBeDefined();
    expect(res.body.assignment).toBeDefined();
    expect(res.body.assignment.maxScore).toBe(100);
    expect(Array.isArray(res.body.rubricScores)).toBe(true);
  });

  it('GET /api/submissions/:id returns 404 for non-existent submission', async () => {
    await ctx.api()
      .get('/api/submissions/999999999')
      .set('Cookie', ctx.authCookie)
      .expect(404);
  });

  it('PATCH /api/submissions/:id updates the score', async () => {
    const res = await ctx.api()
      .patch(`/api/submissions/${submissionId}`)
      .set('Cookie', ctx.authCookie)
      .send({ score: 85 })
      .expect(200);

    expect(res.body.id).toBe(submissionId);
    expect(res.body.score).toBe(85);
  });

  it('PATCH /api/submissions/:id updates the status', async () => {
    const res = await ctx.api()
      .patch(`/api/submissions/${submissionId}`)
      .set('Cookie', ctx.authCookie)
      .send({ status: 'graded' })
      .expect(200);

    expect(res.body.status).toBe('graded');
    expect(res.body.gradedAt).not.toBeNull();
  });

  it('PATCH /api/submissions/:id updates feedback and privateNotes', async () => {
    const res = await ctx.api()
      .patch(`/api/submissions/${submissionId}`)
      .set('Cookie', ctx.authCookie)
      .send({ feedback: 'עבודה מצוינת', privateNotes: 'הגיש מאוחר' })
      .expect(200);

    expect(res.body.feedback).toBe('עבודה מצוינת');
    expect(res.body.privateNotes).toBe('הגיש מאוחר');
  });

  it('PATCH /api/submissions/:id rejects invalid status (400)', async () => {
    const res = await ctx.api()
      .patch(`/api/submissions/${submissionId}`)
      .set('Cookie', ctx.authCookie)
      .send({ status: 'invalid_status' })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  it('POST /api/submissions/:id/file attaches a file URL', async () => {
    const payload = {
      objectPath: 'uploads/test/homework.pdf',
      fileName: 'homework.pdf',
      contentType: 'application/pdf',
      fileSize: 20480,
    };

    const res = await ctx.api()
      .post(`/api/submissions/${submissionId}/file`)
      .set('Cookie', ctx.authCookie)
      .send(payload)
      .expect(200);

    expect(res.body.fileObjectPath).toBe(payload.objectPath);
    expect(res.body.fileName).toBe(payload.fileName);
    expect(res.body.contentType).toBe(payload.contentType);
    expect(res.body.fileSize).toBe(payload.fileSize);
    expect(res.body.submittedAt).not.toBeNull();
  });

  it('POST /api/submissions/:id/file rejects missing fields (400)', async () => {
    const res = await ctx.api()
      .post(`/api/submissions/${submissionId}/file`)
      .set('Cookie', ctx.authCookie)
      .send({ objectPath: 'uploads/test/homework.pdf' })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  it('DELETE /api/submissions/:id/file removes the file', async () => {
    const res = await ctx.api()
      .delete(`/api/submissions/${submissionId}/file`)
      .set('Cookie', ctx.authCookie)
      .expect(200);

    expect(res.body.fileObjectPath).toBeNull();
    expect(res.body.fileName).toBeNull();
    expect(res.body.contentType).toBeNull();
    expect(res.body.fileSize).toBeNull();
  });
});
