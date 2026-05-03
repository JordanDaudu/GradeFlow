import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../storage/object-storage.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { CourseAccessService } from '../auth/course-access.service';
import {
  isDocxByContentType,
  isDocxByName,
  renderDocxBufferToHtml,
  streamToBuffer,
} from './docx-preview.util';

type PreviewKind = 'pdf' | 'docx' | 'doc' | 'other';

export function getPreviewKind(
  contentType: string | null | undefined,
  name: string | null | undefined,
): PreviewKind {
  const ct = (contentType ?? '').toLowerCase();
  const lowerName = (name ?? '').toLowerCase();
  if (ct === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf';
  // .docx (OOXML) — convertible to inline HTML on the server.
  if (isDocxByContentType(ct) || isDocxByName(lowerName)) return 'docx';
  // Legacy .doc (binary OLE) — not supported by mammoth, fall back to download.
  if (ct === 'application/msword' || lowerName.endsWith('.doc')) return 'doc';
  return 'other';
}

@Controller('assignment-files')
export class AssignmentFilesPreviewController {
  private readonly logger = new Logger(AssignmentFilesPreviewController.name);

  constructor(
    private readonly storage: ObjectStorageService,
    private readonly access: CourseAccessService,
  ) {}

  @Get(':fileId/preview')
  async preview(
    @Param('fileId', ParseIntPipe) fileId: number,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const file = await this.access.loadAssignmentFileForUser(user, fileId);
      const kind = getPreviewKind(file.contentType, file.name);
      if (kind === 'docx') {
        await this.streamDocxAsHtml(file, res);
        return;
      }
      if (kind === 'doc') {
        res.status(415).json({
          error:
            'תצוגה מקדימה אינה זמינה לקבצי Word ישנים (.doc). ניתן להוריד את הקובץ ולפתוח אותו במחשב.',
          code: 'PREVIEW_REQUIRES_DOWNLOAD',
        });
        return;
      }
      if (kind === 'other') {
        res.status(415).json({
          error: 'אין תצוגה מקדימה זמינה לסוג קובץ זה. ניתן להוריד את הקובץ.',
          code: 'PREVIEW_UNSUPPORTED',
        });
        return;
      }
      await this.streamFile(file, res, 'inline');
    } catch (error) {
      this.handleStreamError(error, res);
    }
  }

  @Get(':fileId/download')
  async download(
    @Param('fileId', ParseIntPipe) fileId: number,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const file = await this.access.loadAssignmentFileForUser(user, fileId);
      await this.streamFile(file, res, 'attachment', 'application/octet-stream');
    } catch (error) {
      this.handleStreamError(error, res);
    }
  }

  private async streamDocxAsHtml(
    file: { name: string; objectPath: string },
    res: Response,
  ): Promise<void> {
    const objectFile = await this.storage.getObjectEntityFile(file.objectPath);
    const dl = await this.storage.downloadObject(objectFile);
    let html: string;
    try {
      const buffer = await streamToBuffer(dl.stream);
      html = await renderDocxBufferToHtml(buffer, file.name);
    } catch (error) {
      this.logger.error(
        `Failed to render DOCX preview for "${file.name}": ${(error as Error).message}`,
      );
      if (!res.headersSent) {
        res.status(415).json({
          error:
            'לא ניתן היה להציג את קובץ ה-Word בתצוגה מקדימה. ניתן להוריד את הקובץ ולפתוח אותו במחשב.',
          code: 'PREVIEW_REQUIRES_DOWNLOAD',
        });
      }
      return;
    }
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    // Inline disposition with no filename — the browser shouldn't try to
    // save it as something.docx.html.
    res.setHeader('Content-Disposition', 'inline');
    res.send(html);
  }

  private async streamFile(
    file: { name: string; contentType: string; objectPath: string },
    res: Response,
    disposition: 'inline' | 'attachment',
    forceContentType?: string,
  ): Promise<void> {
    const objectFile = await this.storage.getObjectEntityFile(file.objectPath);
    const dl = await this.storage.downloadObject(objectFile);

    // RFC 6266: provide an ASCII fallback `filename="..."` for older clients
    // alongside the UTF-8 `filename*=` form, so Hebrew names render correctly
    // in browsers that don't honor RFC 5987.
    const asciiFallback =
      file.name
        .replace(/[^\x20-\x7E]+/g, '_') // strip non-ASCII (e.g. Hebrew)
        .replace(/["\\]/g, '_') // strip quote / backslash
        .trim() || 'file';
    const utf8Encoded = encodeURIComponent(file.name);
    res.status(200);
    res.setHeader(
      'Content-Type',
      forceContentType ?? file.contentType ?? dl.contentType,
    );
    if (dl.contentLength) res.setHeader('Content-Length', dl.contentLength);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`,
    );
    this.storage.pipeStream(dl.stream, res);
  }

  private handleStreamError(error: unknown, res: Response): void {
    if (error instanceof ObjectNotFoundError) {
      if (!res.headersSent) {
        res.status(404).json({ error: 'הקובץ לא נמצא בקובץ האחסון' });
      }
      return;
    }
    if (error instanceof HttpException) {
      if (!res.headersSent) {
        res.status(error.getStatus()).json(error.getResponse());
      }
      return;
    }
    if (!res.headersSent) {
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'שגיאה בקריאת הקובץ' });
    }
  }
}
