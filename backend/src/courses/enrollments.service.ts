import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureSubmissionsForEnrollment(courseId: number, studentId: number): Promise<void> {
    const assignments = await this.prisma.assignment.findMany({
      where: { courseId },
      select: { id: true },
    });
    if (assignments.length === 0) return;
    await this.prisma.submission.createMany({
      data: assignments.map((a) => ({ assignmentId: a.id, studentId })),
      skipDuplicates: true,
    });
  }

  async ensureSubmissionsForAssignment(assignmentId: number, courseId: number): Promise<void> {
    const enrolled = await this.prisma.enrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    });
    if (enrolled.length === 0) return;
    await this.prisma.submission.createMany({
      data: enrolled.map((e) => ({ assignmentId, studentId: e.studentId })),
      skipDuplicates: true,
    });
  }
}
