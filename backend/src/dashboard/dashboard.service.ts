import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [totalCourses, activeCourses, totalStudents, totalAssignments, breakdownRows] =
      await Promise.all([
        this.prisma.course.count(),
        this.prisma.course.count({ where: { archived: false } }),
        this.prisma.student.count(),
        this.prisma.assignment.count({ where: { closed: false } }),
        this.prisma.submission.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);
    const breakdown: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      needs_review: 0,
      graded: 0,
      returned: 0,
      missing: 0,
    };
    for (const r of breakdownRows) breakdown[r.status] = r._count._all;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [gradedThisWeek, originalityFlagged, lateSubmissions] = await Promise.all([
      this.prisma.submission.count({ where: { gradedAt: { gte: oneWeekAgo } } }),
      this.prisma.submission.count({ where: { originalityFlag: true } }),
      this.prisma.submission.count({ where: { submittedLate: true } }),
    ]);
    return {
      totalCourses,
      activeCourses,
      totalStudents,
      totalAssignments,
      pendingGrading:
        (breakdown.pending ?? 0) +
        (breakdown.in_progress ?? 0) +
        (breakdown.needs_review ?? 0),
      gradedThisWeek,
      originalityFlagged,
      lateSubmissions,
      statusBreakdown: {
        pending: breakdown.pending ?? 0,
        in_progress: breakdown.in_progress ?? 0,
        needs_review: breakdown.needs_review ?? 0,
        graded: breakdown.graded ?? 0,
        returned: breakdown.returned ?? 0,
        missing: breakdown.missing ?? 0,
      },
    };
  }

  async recentSubmissions() {
    const rows = await this.prisma.submission.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 15,
      include: {
        student: true,
        assignment: { include: { course: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      score: r.score === null ? null : Number(r.score),
      updatedAt: r.updatedAt,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      assignmentId: r.assignmentId,
      assignmentName: r.assignment.name,
      courseName: r.assignment.course.name,
    }));
  }
}
