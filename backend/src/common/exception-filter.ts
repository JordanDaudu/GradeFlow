import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

interface ErrorEnvelope {
  error: string;
}

function toEnvelope(input: unknown, fallback: string): ErrorEnvelope {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return { error: trimmed.length > 0 ? trimmed : fallback };
  }
  if (input && typeof input === 'object') {
    const candidate = input as Record<string, unknown>;
    if (typeof candidate.error === 'string' && candidate.error.trim().length > 0) {
      return { error: candidate.error.trim() };
    }
    if (typeof candidate.message === 'string' && candidate.message.trim().length > 0) {
      return { error: candidate.message.trim() };
    }
    if (Array.isArray(candidate.message) && candidate.message.length > 0) {
      const first = candidate.message[0];
      if (typeof first === 'string' && first.trim().length > 0) {
        return { error: first.trim() };
      }
    }
  }
  return { error: fallback };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (res.headersSent) {
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const envelope = toEnvelope(exception.getResponse(), exception.message || 'שגיאה');
      res.status(status).json(envelope);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        res.status(HttpStatus.NOT_FOUND).json({ error: 'לא נמצא' });
        return;
      }
      if (exception.code === 'P2002') {
        res.status(HttpStatus.CONFLICT).json({ error: 'רשומה כפולה' });
        return;
      }
      if (exception.code === 'P2003') {
        res.status(HttpStatus.BAD_REQUEST).json({ error: 'הפניה לא חוקית' });
        return;
      }
      this.logger.warn(`Prisma error ${exception.code} on ${req.method} ${req.url}: ${exception.message}`);
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'שגיאת בסיס נתונים' });
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'שדות לא חוקיים' });
      return;
    }

    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(`Unhandled error on ${req.method} ${req.url}: ${message}`, (exception as Error)?.stack);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'שגיאת שרת' });
  }
}
