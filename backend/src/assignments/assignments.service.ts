import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../courses/enrollments.service';

interface AssignmentWithCounts {
  id: number;
  courseId: number;
  courseName: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  maxScore: number;
  weight: number;
  gradingScale: string;
  closed: boolean;
  submissionCount: number;
  gradedCount: number;
}

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  private async listBase(courseId?: number): Promise<AssignmentWithCounts[]> {
    const where: { courseId?: number } = {};
    if (courseId !== undefined) where.courseId = courseId;
    const rows = await this.prisma.assignment.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      include: {
        course: { select: { name: true } },
        _count: {
          select: {
            submissions: true,
          },
        },
        submissions: {
          // Count only statuses that are complete from the assignment-card perspective.
          // needs_review is intentionally excluded because it still requires grader action.
          where: { status: { in: ['graded', 'returned', 'missing'] } },
          select: { id: true },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      courseName: r.course.name,
      name: r.name,
      description: r.description,
      dueDate: r.dueDate,
      maxScore: Number(r.maxScore),
      weight: Number(r.weight),
      gradingScale: r.gradingScale,
      closed: r.closed,
      submissionCount: r._count.submissions,
      gradedCount: r.submissions.length,
    }));
  }

  list(courseId?: number) {
    return this.listBase(courseId);
  }

  async create(data: {
    courseId: number;
    name: string;
    description?: string | null;
    dueDate?: string | Date | null;
    maxScore?: number | string;
    weight?: number | string;
    gradingScale?: string;
  }): Promise<AssignmentWithCounts> {
    if (typeof data.courseId !== 'number' || !data.name) {
      throw new BadRequestException({ error: 'שדות חסרים' });
    }
    const a = await this.prisma.assignment.create({
      data: {
        courseId: data.courseId,
        name: data.name,
        description: data.description ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        maxScore: data.maxScore !== undefined ? String(data.maxScore) : '100',
        weight: data.weight !== undefined ? String(data.weight) : '1',
        gradingScale: data.gradingScale ?? 'numeric',
      },
    });
    await this.enrollments.ensureSubmissionsForAssignment(a.id, data.courseId);
    const all = await this.listBase(data.courseId);
    const detail = all.find((x) => x.id === a.id);
    if (!detail) throw new NotFoundException({ error: 'לא נמצא' });
    return detail;
  }

  async getById(id: number) {
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException({ error: 'לא נמצא' });
    const all = await this.listBase(a.courseId);
    const detail = all.find((x) => x.id === id);
    const files = await this.prisma.assignmentFile.findMany({ where: { assignmentId: id } });
    return { ...detail, files };
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string | null;
      dueDate?: string | Date | null;
      maxScore?: number | string;
      weight?: number | string;
      gradingScale?: string;
    },
  ): Promise<AssignmentWithCounts> {
    const setData: Record<string, unknown> = {};
    if (data.name !== undefined) setData.name = data.name;
    if (data.description !== undefined) setData.description = data.description;
    if (data.dueDate !== undefined) setData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.maxScore !== undefined) setData.maxScore = String(data.maxScore);
    if (data.weight !== undefined) setData.weight = String(data.weight);
    if (data.gradingScale !== undefined) setData.gradingScale = data.gradingScale;
    await this.prisma.assignment.update({ where: { id }, data: setData });
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException({ error: 'לא נמצא' });
    const all = await this.listBase(a.courseId);
    const detail = all.find((x) => x.id === id);
    if (!detail) throw new NotFoundException({ error: 'לא נמצא' });
    return detail;
  }

  async setClosed(id: number, closed: boolean): Promise<AssignmentWithCounts> {
    await this.prisma.assignment.update({ where: { id }, data: { closed } });
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException({ error: 'לא נמצא' });
    const all = await this.listBase(a.courseId);
    const detail = all.find((x) => x.id === id);
    if (!detail) throw new NotFoundException({ error: 'לא נמצא' });
    return detail;
  }

  async delete(id: number) {
    await this.prisma.assignment.delete({ where: { id } });
    return { ok: true };
  }
}
