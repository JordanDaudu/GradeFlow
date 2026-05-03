import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(courseId?: number) {
    if (courseId !== undefined && Number.isFinite(courseId)) {
      return this.prisma.feedbackTemplate.findMany({
        where: { OR: [{ courseId }, { courseId: null }] },
        orderBy: { title: 'asc' },
      });
    }
    return this.prisma.feedbackTemplate.findMany({ orderBy: { title: 'asc' } });
  }

  async create(body: { title?: string; body?: string; category?: string | null; courseId?: number | null }) {
    if (!body?.title || !body?.body) {
      throw new BadRequestException({ error: 'כותרת וגוף נדרשים' });
    }
    return this.prisma.feedbackTemplate.create({
      data: {
        title: body.title,
        body: body.body,
        category: body.category ?? null,
        courseId: body.courseId ?? null,
      },
    });
  }

  async update(
    id: number,
    body: { title?: string; body?: string; category?: string | null; courseId?: number | null },
  ) {
    const setObj: Record<string, unknown> = {};
    if (body?.title !== undefined) setObj.title = body.title;
    if (body?.body !== undefined) setObj.body = body.body;
    if (body?.category !== undefined) setObj.category = body.category;
    if (body?.courseId !== undefined) setObj.courseId = body.courseId;
    await this.prisma.feedbackTemplate.update({ where: { id }, data: setObj });
    return this.prisma.feedbackTemplate.findUnique({ where: { id } });
  }

  async delete(id: number) {
    await this.prisma.feedbackTemplate.delete({ where: { id } });
    return { ok: true };
  }
}
