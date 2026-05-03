import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { closeTestContext, getTestContext, unique, type TestContext } from './setup';

describe('CSV import + export', () => {
  let ctx: TestContext;
  let courseId: number;
  let assignmentId: number;
  const externalIds: string[] = [];

  beforeAll(async () => {
    ctx = await getTestContext();
    const course = await ctx.prisma.course.create({
      data: { code: unique('IMP'), name: 'בדיקת ייבוא', term: 'אביב', year: 2099 },
    });
    courseId = course.id;
    const a = await ctx.prisma.assignment.create({
      data: { courseId, name: 'מטלת ייצוא', maxScore: '100', weight: '1' },
    });
    assignmentId = a.id;
    for (let i = 0; i < 3; i++) externalIds.push(unique('EXT'));
  });

  afterAll(async () => {
    await ctx.prisma.student.deleteMany({ where: { externalId: { in: externalIds } } });
    await ctx.prisma.course.deleteMany({ where: { id: courseId } });
    await closeTestContext();
  });

  it('POST /api/import/students rejects empty CSV with 400 + Hebrew error', async () => {
    const res = await ctx.api()
      .post('/api/import/students')
      .set('Cookie', ctx.authCookie)
      .send({ csv: '' })
      .expect(400);
    expect(res.body.error).toMatch(/CSV/);
  });

  it('POST /api/import/students creates students + enrolls them in the course', async () => {
    const csvRows = [
      'תעודת זהות,שם פרטי,שם משפחה,אימייל',
      `${externalIds[0]},אבי,כהן,avi@example.com`,
      `${externalIds[1]},שרה,לוי,sara@example.com`,
      `${externalIds[2]},דן,פרץ,dan@example.com`,
    ];
    const csv = csvRows.join('\n');

    const res = await ctx.api()
      .post('/api/import/students')
      .set('Cookie', ctx.authCookie)
      .send({ csv, courseId })
      .expect(200);
    expect(res.body).toMatchObject({ created: 3, updated: 0, enrolled: 3, errors: [] });

    const enrolled = await ctx.prisma.enrollment.count({ where: { courseId } });
    expect(enrolled).toBe(3);

    const subs = await ctx.prisma.submission.count({ where: { assignmentId } });
    expect(subs).toBe(3);
  });

  it('POST /api/import/students re-import upserts (updated count > 0, no duplicates)', async () => {
    const csvRows = [
      'תעודת זהות,שם פרטי,שם משפחה',
      `${externalIds[0]},אבי-מעודכן,כהן`,
      `${externalIds[1]},שרה-מעודכנת,לוי`,
    ];
    const csv = csvRows.join('\n');
    const res = await ctx.api()
      .post('/api/import/students')
      .set('Cookie', ctx.authCookie)
      .send({ csv, courseId })
      .expect(200);
    expect(res.body.updated).toBe(2);
    expect(res.body.created).toBe(0);

    const total = await ctx.prisma.student.count({
      where: { externalId: { in: externalIds.slice(0, 2) } },
    });
    expect(total).toBe(2);
  });

  it('GET /api/export/gradebook/:courseId returns CSV with BOM + Hebrew header + students', async () => {
    const res = await ctx.api()
      .get(`/api/export/gradebook/${courseId}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    const text = res.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('תעודת זהות');
    expect(text).toContain('שם משפחה');
    expect(text).toContain('ממוצע משוקלל');
    expect(text).toContain(externalIds[0]);
  });

  it('GET /api/export/assignment/:id returns CSV with submissions', async () => {
    const res = await ctx.api()
      .get(`/api/export/assignment/${assignmentId}`)
      .set('Cookie', ctx.authCookie)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('שם הסטודנט');
    expect(res.text).toContain('סטטוס');
    expect(res.text).toContain('לא נבדק');
  });

  it('GET /api/export/gradebook/:courseId returns 404 for unknown course', async () => {
    await ctx.api()
      .get('/api/export/gradebook/9999999')
      .set('Cookie', ctx.authCookie)
      .expect(404);
  });
});
