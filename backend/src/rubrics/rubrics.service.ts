import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class RubricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissions: SubmissionsService,
  ) {}

  async listCriteria(assignmentId: number) {
    const rows = await this.prisma.rubricCriterion.findMany({
      where: { assignmentId },
      orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => ({ ...r, maxPoints: Number(r.maxPoints), weight: Number(r.weight) }));
  }

  async replaceCriteria(
    assignmentId: number,
    criteria: Array<{
      name: string;
      description?: string | null;
      maxPoints: number;
      weight?: number;
      orderIndex?: number;
    }>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.rubricCriterion.deleteMany({ where: { assignmentId } });
      if (criteria.length > 0) {
        await tx.rubricCriterion.createMany({
          data: criteria.map((c, i) => ({
            assignmentId,
            name: c.name,
            description: c.description ?? null,
            maxPoints: String(c.maxPoints),
            weight: String(c.weight ?? 1),
            orderIndex: c.orderIndex ?? i,
          })),
        });
      }
    });
    return this.listCriteria(assignmentId);
  }

  async listScores(submissionId: number) {
    const rows = await this.prisma.rubricScore.findMany({ where: { submissionId } });
    return rows.map((r) => ({ ...r, points: Number(r.points) }));
  }

  async replaceScores(
    submissionId: number,
    scores: Array<{ criterionId: number; points: number; comment?: string | null }>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.rubricScore.deleteMany({ where: { submissionId } });
      if (scores.length > 0) {
        await tx.rubricScore.createMany({
          data: scores.map((s) => ({
            submissionId,
            criterionId: s.criterionId,
            points: String(s.points),
            comment: s.comment ?? null,
          })),
        });
      }
      const total = scores.reduce((sum, s) => sum + Number(s.points || 0), 0);
      await tx.submission.update({
        where: { id: submissionId },
        data: { score: String(total), updatedAt: new Date() },
      });
    });
    const detail = await this.submissions.getDetail(submissionId);
    if (!detail) throw new NotFoundException({ error: 'לא נמצא' });
    return detail;
  }
}
