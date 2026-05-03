import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from './enrollments.service';

interface CourseWithCounts {
  id: number;
  code: string;
  name: string;
  term: string;
  year: number;
  archived: boolean;
  studentCount: number;
  assignmentCount: number;
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  private async withCounts(opts: { id?: number; includeArchived?: boolean } = {}): Promise<CourseWithCounts[]> {
    const where: { id?: number; archived?: boolean } = {};
    if (opts.id !== undefined) where.id = opts.id;
    if (opts.id === undefined && opts.includeArchived === false) where.archived = false;

    const rows = await this.prisma.course.findMany({
      where,
      orderBy: [{ year: 'desc' }, { code: 'asc' }],
      include: {
        _count: { select: { enrollments: true, assignments: true } },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      term: c.term,
      year: c.year,
      archived: c.archived,
      studentCount: c._count.enrollments,
      assignmentCount: c._count.assignments,
    }));
  }

  async list(includeArchived: boolean): Promise<CourseWithCounts[]> {
    return this.withCounts({ includeArchived });
  }

  async create(data: { code: string; name: string; term: string; year: number }): Promise<CourseWithCounts> {
    const c = await this.prisma.course.create({ data });
    const [withCounts] = await this.withCounts({ id: c.id });
    return withCounts;
  }

  async getById(id: number): Promise<CourseWithCounts> {
    const [c] = await this.withCounts({ id });
    if (!c) throw new NotFoundException({ error: 'לא נמצא' });
    return c;
  }

  async update(
    id: number,
    data: { code?: string; name?: string; term?: string; year?: number; archived?: boolean },
  ): Promise<CourseWithCounts> {
    const setData: Record<string, unknown> = {};
    if (data.code !== undefined) setData.code = data.code;
    if (data.name !== undefined) setData.name = data.name;
    if (data.term !== undefined) setData.term = data.term;
    if (data.year !== undefined) setData.year = data.year;
    if (data.archived !== undefined) setData.archived = !!data.archived;
    await this.prisma.course.update({ where: { id }, data: setData });
    return this.getById(id);
  }

  async setArchived(id: number, archived: boolean): Promise<CourseWithCounts> {
    await this.prisma.course.update({ where: { id }, data: { archived } });
    return this.getById(id);
  }

  async delete(id: number): Promise<{ ok: true }> {
    await this.prisma.course.delete({ where: { id } });
    return { ok: true };
  }

  async listStudents(courseId: number) {
    const rows = await this.prisma.enrollment.findMany({
      where: { courseId },
      include: { student: true },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });
    return rows.map((r) => ({
      id: r.student.id,
      externalId: r.student.externalId,
      firstName: r.student.firstName,
      lastName: r.student.lastName,
      email: r.student.email,
      phone: r.student.phone,
      notes: r.student.notes,
    }));
  }

  async addStudent(courseId: number, studentId: number) {
    await this.prisma.enrollment.upsert({
      where: { courseId_studentId: { courseId, studentId } },
      update: {},
      create: { courseId, studentId },
    });
    await this.enrollments.ensureSubmissionsForEnrollment(courseId, studentId);
    return { ok: true };
  }

  async removeStudent(courseId: number, studentId: number) {
    await this.prisma.enrollment.deleteMany({ where: { courseId, studentId } });
    return { ok: true };
  }

  async gradebook(courseId: number) {
    const course = await this.getById(courseId);
    const assignments = await this.prisma.assignment.findMany({
      where: { courseId },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      include: { student: true },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });
    const students = enrollments.map((e) => ({
      id: e.student.id,
      externalId: e.student.externalId,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      email: e.student.email,
      phone: e.student.phone,
      notes: e.student.notes,
    }));
    const aIds = assignments.map((a) => a.id);
    const subs =
      aIds.length === 0
        ? []
        : await this.prisma.submission.findMany({ where: { assignmentId: { in: aIds } } });
    const grades = subs.map((s) => ({
      studentId: s.studentId,
      assignmentId: s.assignmentId,
      submissionId: s.id,
      status: s.status,
      score: s.score === null ? null : Number(s.score),
    }));
    return {
      course,
      assignments: assignments.map((a) => ({
        ...a,
        maxScore: Number(a.maxScore),
        weight: Number(a.weight),
        submissionCount: 0,
        gradedCount: 0,
      })),
      students,
      grades,
    };
  }
}
