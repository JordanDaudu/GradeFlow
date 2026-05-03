import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import {
  MAX_ASSIGNMENT_FILE_BYTES,
  isDangerousFileName,
} from './dto';

const ALLOWED_FILE_TYPES = new Set(['instructions', 'grading_guide', 'reference', 'extra']);

@Injectable()
export class AssignmentFilesService {
  private readonly logger = new Logger(AssignmentFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  list(assignmentId: number) {
    return this.prisma.assignmentFile.findMany({ where: { assignmentId } });
  }

  async create(
    assignmentId: number,
    body: { name?: string; objectPath?: string; contentType?: string; size?: number; fileType?: string },
  ) {
    const { name, objectPath, contentType, size, fileType } = body ?? {};
    if (!name || !objectPath || !contentType || typeof size !== 'number') {
      throw new BadRequestException({ error: 'שדות חסרים' });
    }
    if (size > MAX_ASSIGNMENT_FILE_BYTES) {
      throw new BadRequestException({ error: 'גודל הקובץ חורג מהמגבלה המותרת' });
    }
    if (isDangerousFileName(name)) {
      throw new BadRequestException({ error: 'סוג הקובץ אינו נתמך מטעמי אבטחה' });
    }
    const ft = typeof fileType === 'string' && ALLOWED_FILE_TYPES.has(fileType) ? fileType : 'extra';
    return this.prisma.assignmentFile.create({
      data: { assignmentId, name, objectPath, contentType, size, fileType: ft },
    });
  }

  async update(fileId: number, body: { name?: string; fileType?: string }) {
    const setObj: Record<string, unknown> = {};
    if (typeof body?.name === 'string' && body.name.length > 0) setObj.name = body.name;
    if (typeof body?.fileType === 'string' && ALLOWED_FILE_TYPES.has(body.fileType)) {
      setObj.fileType = body.fileType;
    }
    if (Object.keys(setObj).length === 0) {
      throw new BadRequestException({ error: 'אין שדות לעדכון' });
    }
    await this.prisma.assignmentFile.update({ where: { id: fileId }, data: setObj });
    const f = await this.prisma.assignmentFile.findUnique({ where: { id: fileId } });
    if (!f) throw new NotFoundException({ error: 'לא נמצא' });
    return f;
  }

  async delete(fileId: number) {
    const file = await this.prisma.assignmentFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException({ error: 'הקובץ לא נמצא' });
    await this.prisma.assignmentFile.delete({ where: { id: fileId } });
    try {
      await this.storage.deleteObject(file.objectPath);
    } catch (err) {
      this.logger.warn(
        `Failed to delete object ${file.objectPath} for assignment file ${fileId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return { ok: true };
  }
}
