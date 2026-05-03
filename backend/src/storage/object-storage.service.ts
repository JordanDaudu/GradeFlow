import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Readable } from 'stream';
import { ReplitStorageBackend } from './backends/replit.backend';
import { S3StorageBackend } from './backends/s3.backend';

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface StorageFile {
  name: string;
}

export interface DownloadResult {
  contentType: string;
  contentLength?: string;
  cacheControl: string;
  stream: NodeJS.ReadableStream;
}

interface StorageBackend {
  searchPublicObject(filePath: string): Promise<StorageFile | null>;
  downloadObject(file: StorageFile, cacheTtlSec?: number): Promise<DownloadResult>;
  getObjectEntityUploadURL(): Promise<string>;
  normalizeObjectEntityPath(rawPath: string): string;
  getObjectEntityFile(objectPath: string): Promise<StorageFile>;
  deleteObject(objectPath: string): Promise<void>;
  pipeStream(stream: NodeJS.ReadableStream, res: import('express').Response): void;
}

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly backend: StorageBackend;

  constructor() {
    const backendType = (process.env.STORAGE_BACKEND ?? 'replit').toLowerCase();

    if (backendType === 's3') {
      this.backend = new S3StorageBackend();
      this.logger.log('Storage backend: S3 (AWS-compatible)');
    } else {
      this.backend = new ReplitStorageBackend();
      this.logger.log('Storage backend: Replit Object Storage');
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.backend instanceof S3StorageBackend) {
      try {
        await this.backend.ensureBucket();
        this.logger.log(`S3 bucket ready: ${process.env.S3_BUCKET}`);
      } catch (err) {
        this.logger.error(
          `Failed to ensure S3 bucket on startup: ${(err as Error).message}. ` +
            'File upload and preview will fail until the bucket is accessible.',
        );
      }
    }
  }

  async searchPublicObject(filePath: string): Promise<StorageFile | null> {
    return this.backend.searchPublicObject(filePath);
  }

  async downloadObject(file: StorageFile, cacheTtlSec = 3600): Promise<DownloadResult> {
    return this.backend.downloadObject(file, cacheTtlSec);
  }

  async getObjectEntityUploadURL(): Promise<string> {
    return this.backend.getObjectEntityUploadURL();
  }

  normalizeObjectEntityPath(rawPath: string): string {
    return this.backend.normalizeObjectEntityPath(rawPath);
  }

  async getObjectEntityFile(objectPath: string): Promise<StorageFile> {
    return this.backend.getObjectEntityFile(objectPath);
  }

  async deleteObject(objectPath: string): Promise<void> {
    return this.backend.deleteObject(objectPath);
  }

  pipeStream(stream: NodeJS.ReadableStream, res: import('express').Response): void {
    (stream as Readable).pipe(res);
  }
}
