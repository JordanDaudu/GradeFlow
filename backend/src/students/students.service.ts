import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: string) {
    if (q) {
      return this.prisma.student.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { externalId: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 200,
      });
    }
    return this.prisma.student.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 500,
    });
  }

  async create(data: {
    externalId: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  }) {
    try {
      return await this.prisma.student.create({
        data: {
          externalId: data.externalId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          notes: data.notes ?? null,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ error: 'תלמיד עם תעודת זהות זו כבר קיים' });
      }
      throw e;
    }
  }

  async getById(id: number) {
    const s = await this.prisma.student.findUnique({ where: { id } });
    if (!s) throw new NotFoundException({ error: 'תלמיד לא נמצא' });
    return s;
  }

  async update(
    id: number,
    data: {
      externalId?: string;
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
    },
  ) {
    const setData: Record<string, unknown> = {};
    if (data.externalId !== undefined) setData.externalId = data.externalId;
    if (data.firstName !== undefined) setData.firstName = data.firstName;
    if (data.lastName !== undefined) setData.lastName = data.lastName;
    if (data.email !== undefined) setData.email = data.email;
    if (data.phone !== undefined) setData.phone = data.phone;
    if (data.notes !== undefined) setData.notes = data.notes;
    await this.prisma.student.update({ where: { id }, data: setData });
    return this.prisma.student.findUnique({ where: { id } });
  }

  async history(id: number) {
    const s = await this.getById(id);
    const subs = await this.prisma.submission.findMany({
      where: { studentId: id },
      orderBy: { updatedAt: 'desc' },
      include: {
        assignment: { include: { course: true } },
      },
    });
    const items = subs.map((sub) => ({
      ...sub,
      score: sub.score === null ? null : Number(sub.score),
      assignment: {
        id: sub.assignment.id,
        title: sub.assignment.name,
        maxScore: Number(sub.assignment.maxScore),
        dueDate: sub.assignment.dueDate,
        courseId: sub.assignment.courseId,
      },
      course: {
        id: sub.assignment.course.id,
        name: sub.assignment.course.name,
        code: sub.assignment.course.code,
      },
    }));
    const totalSubmissions = items.length;
    const graded = items.filter((i) => i.status === 'graded' || i.status === 'returned');
    const averageScore =
      graded.length > 0
        ? graded.reduce((sum, i) => sum + (i.score ?? 0), 0) / graded.length
        : null;
    return { student: s, items, summary: { totalSubmissions, gradedCount: graded.length, averageScore } };
  }

  async delete(id: number) {
    await this.prisma.student.delete({ where: { id } });
    return { ok: true };
  }
}
