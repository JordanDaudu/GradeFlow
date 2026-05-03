import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toCsv } from '../common/csv.util';

const STATUS_HE: Record<string, string> = {
  pending: 'לא נבדק',
  in_progress: 'בתהליך',
  needs_review: 'דורש בדיקה חוזרת',
  graded: 'נבדק',
  returned: 'הוחזר',
  missing: 'חסר הגשה',
};

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async gradebookCsv(courseId: number): Promise<{ filename: string; csv: string }> {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException({ error: 'קורס לא נמצא' });

    const assignments = await this.prisma.assignment.findMany({
      where: { courseId },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      include: { student: true },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });
    const students = enrollments.map((e) => e.student);
    const aIds = assignments.map((a) => a.id);
    const subs =
      aIds.length === 0
        ? []
        : await this.prisma.submission.findMany({ where: { assignmentId: { in: aIds } } });

    const key = (sid: number, aid: number) => `${sid}:${aid}`;
    const map = new Map<string, number | null>();
    for (const s of subs) {
      map.set(key(s.studentId, s.assignmentId), s.score === null ? null : Number(s.score));
    }

    const header = [
      'תעודת זהות',
      'שם משפחה',
      'שם פרטי',
      ...assignments.map((a) => a.name),
      'ממוצע משוקלל',
    ];
    const rows: (string | number | null)[][] = [header];
    for (const st of students) {
      const grades = assignments.map((a) => map.get(key(st.id, a.id)) ?? null);
      let totW = 0;
      let totS = 0;
      assignments.forEach((a, idx) => {
        const g = grades[idx];
        if (g !== null && g !== undefined) {
          const w = Number(a.weight);
          const max = Number(a.maxScore) || 100;
          totW += w;
          totS += (g / max) * 100 * w;
        }
      });
      const avg = totW > 0 ? Math.round((totS / totW) * 100) / 100 : null;
      rows.push([st.externalId, st.lastName, st.firstName, ...grades, avg]);
    }
    const csv = '\uFEFF' + toCsv(rows);
    return { filename: `gradebook-${course.code}.csv`, csv };
  }

  async assignmentCsv(assignmentId: number): Promise<{ filename: string; csv: string }> {
    const a = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!a) throw new NotFoundException({ error: 'מטלה לא נמצאה' });
    const course = await this.prisma.course.findUnique({ where: { id: a.courseId } });
    const subs = await this.prisma.submission.findMany({
      where: { assignmentId },
      include: { student: true },
    });

    const header = [
      'שם הסטודנט',
      'תעודת זהות',
      'קורס',
      'מטלה',
      'ציון',
      'סטטוס',
      'הערות',
      'דגל מקוריות',
      'הוגש באיחור',
    ];
    const rows: (string | number | null)[][] = [header];
    for (const sub of subs) {
      const st = sub.student;
      if (!st) continue;
      const score = sub.score === null ? '' : Number(sub.score);
      const lateLabel = sub.submittedLate ? 'כן' : 'לא';
      const flagLabel = sub.originalityFlag ? 'כן' : 'לא';
      const fullName = `${st.firstName} ${st.lastName}`.trim();
      rows.push([
        fullName,
        st.externalId,
        course?.name ?? '',
        a.name,
        score,
        STATUS_HE[sub.status] ?? sub.status,
        sub.feedback ?? '',
        flagLabel,
        lateLabel,
      ]);
    }
    const csv = '\uFEFF' + toCsv(rows);
    return { filename: `assignment-${assignmentId}.csv`, csv };
  }
}
