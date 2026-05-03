import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';

const ADMIN_ROLE = 'admin';

@Injectable()
export class CourseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isAdmin(user: AuthUser | undefined | null): boolean {
    return !!user && user.role === ADMIN_ROLE;
  }

  assertCanAccessCourse(
    user: AuthUser | undefined | null,
    _courseId: number,
  ): void {
    if (!user) {
      throw new ForbiddenException({ error: 'אין הרשאה לגשת לקורס זה' });
    }
    if (this.isAdmin(user)) return;
    throw new ForbiddenException({ error: 'אין הרשאה לגשת לקורס זה' });
  }

  async assertCanAccessAssignment(
    user: AuthUser | undefined | null,
    assignmentId: number,
  ): Promise<{ courseId: number }> {
    const a = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { courseId: true },
    });
    if (!a) throw new NotFoundException({ error: 'לא נמצא' });
    this.assertCanAccessCourse(user, a.courseId);
    return { courseId: a.courseId };
  }

  async loadAssignmentFileForUser(
    user: AuthUser | undefined | null,
    fileId: number,
    expectedAssignmentId?: number,
  ) {
    const file = await this.prisma.assignmentFile.findUnique({
      where: { id: fileId },
      include: { assignment: { select: { courseId: true } } },
    });
    if (!file) throw new NotFoundException({ error: 'הקובץ לא נמצא' });
    if (
      expectedAssignmentId !== undefined &&
      file.assignmentId !== expectedAssignmentId
    ) {
      throw new NotFoundException({ error: 'הקובץ לא נמצא' });
    }
    this.assertCanAccessCourse(user, file.assignment.courseId);
    return file;
  }
}
