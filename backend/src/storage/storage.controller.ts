import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';
import { ObjectNotFoundError, ObjectStorageService } from './object-storage.service';
import { RequestUploadUrlDto } from './dto';
import {
  isDocxByContentType,
  isDocxByName,
  renderDocxBufferToHtml,
  streamToBuffer,
} from '../assignment-files/docx-preview.util';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storage: ObjectStorageService) {}

  private static readonly MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
  private static readonly ALLOWED_CONTENT_TYPES = new Set(['application/pdf']);

  @HttpCode(200)
  @Post('uploads/request-url')
  async requestUploadUrl(@Body() body: RequestUploadUrlDto) {
    if (!StorageController.ALLOWED_CONTENT_TYPES.has(body.contentType)) {
      throw new HttpException({ error: 'ניתן להעלות קבצי PDF בלבד.' }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (body.size > StorageController.MAX_UPLOAD_BYTES) {
      throw new HttpException({ error: 'גודל הקובץ חורג מהמגבלה המותרת (עד 50MB).' }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    try {
      const uploadURL = await this.storage.getObjectEntityUploadURL();
      const objectPath = this.storage.normalizeObjectEntityPath(uploadURL);
      return {
        uploadURL,
        objectPath,
        metadata: { name: body.name, size: body.size, contentType: body.contentType },
      };
    } catch {
      throw new InternalServerErrorException({ error: 'Failed to generate upload URL' });
    }
  }

  @Public()
  @Get('public-objects/*')
  async servePublicObject(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const filePath = req.path.replace(/^\/+api\/+storage\/+public-objects\/+/, '');
      const file = await this.storage.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      const dl = await this.storage.downloadObject(file);
      res.status(200);
      res.setHeader('Content-Type', dl.contentType);
      if (dl.contentLength) res.setHeader('Content-Length', dl.contentLength);
      res.setHeader('Cache-Control', dl.cacheControl);
      this.storage.pipeStream(dl.stream, res);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to serve public object' });
      }
    }
  }

  @Get('objects/*')
  async serveObject(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const wildcardPath = req.path.replace(/^\/+api\/+storage\/+objects\/+/, '');
      const objectPath = `/objects/${wildcardPath}`;
      const objectFile = await this.storage.getObjectEntityFile(objectPath);
      const dl = await this.storage.downloadObject(objectFile);

      // Inline preview path for student submissions: when the stored object
      // is a .docx, transparently render it as HTML so the iframe in the
      // grading page can show it without forcing a download.
      const objectName = objectFile.name ?? '';
      if (isDocxByContentType(dl.contentType) || isDocxByName(objectName)) {
        try {
          const buffer = await streamToBuffer(dl.stream);
          const displayName = objectName.split('/').pop() || 'document.docx';
          const html = await renderDocxBufferToHtml(buffer, displayName);
          res.status(200);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', dl.cacheControl);
          res.setHeader('Content-Disposition', 'inline');
          res.send(html);
          return;
        } catch (error) {
          this.logger.error(
            `Failed to render DOCX preview for object "${objectPath}": ${(error as Error).message}`,
          );
          // Fall through to streaming the raw bytes so the browser at least
          // sees something rather than a hard 500.
        }
      }

      res.status(200);
      res.setHeader('Content-Type', dl.contentType);
      if (dl.contentLength) res.setHeader('Content-Length', dl.contentLength);
      res.setHeader('Cache-Control', dl.cacheControl);
      res.setHeader('Content-Disposition', 'inline');
      this.storage.pipeStream(dl.stream, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        if (!res.headersSent) {
          res.status(404).json({ error: 'Object not found' });
        }
        return;
      }
      if (error instanceof HttpException) {
        if (!res.headersSent) res.status(error.getStatus()).json(error.getResponse());
        return;
      }
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to serve object' });
      }
    }
  }
}
