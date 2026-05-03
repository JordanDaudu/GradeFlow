import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const ALLOWED_STATUSES = new Set([
  'pending',
  'in_progress',
  'needs_review',
  'graded',
  'returned',
  'missing',
]);

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDetail(id: number) {
    const s = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        student: true,
        assignment: { include: { course: true } },
        rubricScores: true,
      },
    });
    if (!s) return null;
    const a = s.assignment;
    return {
      id: s.id,
      assignmentId: s.assignmentId,
      studentId: s.studentId,
      status: s.status,
      score: s.score === null ? null : Number(s.score),
      feedback: s.feedback,
      privateNotes: s.privateNotes,
      originalityFlag: s.originalityFlag,
      submittedAt: s.submittedAt,
      submittedLate: s.submittedLate,
      fileObjectPath: s.fileObjectPath,
      fileName: s.fileName,
      contentType: s.contentType,
      fileSize: s.fileSize,
      gradedAt: s.gradedAt,
      gradedById: s.gradedById,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      student: s.student,
      assignment: {
        id: a.id,
        courseId: a.courseId,
        name: a.name,
        description: a.description,
        dueDate: a.dueDate,
        gradingScale: a.gradingScale,
        createdAt: a.createdAt,
        courseName: a.course?.name,
        maxScore: Number(a.maxScore),
        weight: Number(a.weight),
        submissionCount: 0,
        gradedCount: 0,
      },
      rubricScores: s.rubricScores.map((r) => ({ ...r, points: Number(r.points) })),
    };
  }

  async listForAssignment(assignmentId: number) {
    const subs = await this.prisma.submission.findMany({
      where: { assignmentId },
      include: { student: true },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
        { id: 'asc' },
      ],
    });
    return subs.map((s) => ({
      ...s,
      score: s.score === null ? null : Number(s.score),
    }));
  }

  async bulkUpdateStatus(assignmentId: number, submissionIds: unknown, status: unknown) {
    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      throw new BadRequestException({ error: 'submissionIds נדרש' });
    }
    if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
      throw new BadRequestException({ error: 'סטטוס לא חוקי' });
    }
    const ids = (submissionIds as unknown[])
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) {
      throw new BadRequestException({ error: 'submissionIds נדרש' });
    }
    const result = await this.prisma.submission.updateMany({
      where: { assignmentId, id: { in: ids } },
      data: { status, updatedAt: new Date() },
    });
    return { updated: result.count };
  }

  async update(
    id: number,
    body: {
      status?: string;
      score?: number | string | null;
      feedback?: string | null;
      privateNotes?: string | null;
      originalityFlag?: boolean;
      submittedLate?: boolean;
      submittedAt?: string | Date | null;
    },
    userId: number | undefined,
  ) {
    if (body?.status !== undefined && !ALLOWED_STATUSES.has(body.status)) {
      throw new BadRequestException({ error: 'סטטוס לא חוקי' });
    }
    const setObj: Record<string, unknown> = { updatedAt: new Date() };
    if (body?.status !== undefined) setObj.status = body.status;
    if (body?.score !== undefined) setObj.score = body.score === null ? null : String(body.score);
    if (body?.feedback !== undefined) setObj.feedback = body.feedback;
    if (body?.privateNotes !== undefined) setObj.privateNotes = body.privateNotes;
    if (body?.originalityFlag !== undefined) setObj.originalityFlag = !!body.originalityFlag;
    if (body?.submittedLate !== undefined) setObj.submittedLate = !!body.submittedLate;
    if (body?.submittedAt !== undefined) {
      setObj.submittedAt = body.submittedAt ? new Date(body.submittedAt) : null;
    }
    if (body?.status === 'graded' || body?.status === 'returned') {
      setObj.gradedAt = new Date();
      setObj.gradedById = userId ?? null;
    }
    await this.prisma.submission.update({ where: { id }, data: setObj });
    const d = await this.getDetail(id);
    if (!d) throw new NotFoundException({ error: 'לא נמצא' });
    return d;
  }

  async removeFile(id: number) {
    await this.prisma.submission.update({
      where: { id },
      data: {
        fileObjectPath: null,
        fileName: null,
        contentType: null,
        fileSize: null,
        updatedAt: new Date(),
      },
    });
    const d = await this.getDetail(id);
    if (!d) throw new NotFoundException({ error: 'לא נמצא' });
    return d;
  }

  async attachFile(
    id: number,
    body: { objectPath?: string; fileName?: string; contentType?: string; fileSize?: number },
  ) {
    const { objectPath, fileName, contentType, fileSize } = body ?? {};
    if (!objectPath || !fileName || !contentType || typeof fileSize !== 'number') {
      throw new BadRequestException({ error: 'שדות חסרים' });
    }
    await this.prisma.submission.update({
      where: { id },
      data: {
        fileObjectPath: objectPath,
        fileName,
        contentType,
        fileSize,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const d = await this.getDetail(id);
    if (!d) throw new NotFoundException({ error: 'לא נמצא' });
    return d;
  }
}
