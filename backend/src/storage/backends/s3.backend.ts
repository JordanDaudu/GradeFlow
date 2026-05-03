import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { ObjectNotFoundError, StorageFile, DownloadResult } from '../object-storage.service';

interface S3StorageFile extends StorageFile {
  _bucket: string;
  _key: string;
}

export class S3StorageBackend {
  private readonly client: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;
  private readonly forcePathStyle: boolean;
  private readonly prefix: string;
  private _bucketEnsured = false;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error('S3_BUCKET environment variable is required when STORAGE_BACKEND=s3');
    }
    this.bucket = bucket;
    this.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    this.prefix = (process.env.S3_PREFIX ?? '').replace(/\/$/, '');

    const region = process.env.S3_REGION ?? 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT;
    const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? endpoint;

    const credentials =
      process.env.S3_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
          }
        : undefined;

    this.client = new S3Client({
      region,
      credentials,
      endpoint,
      forcePathStyle: this.forcePathStyle,
    });

    this.publicClient =
      publicEndpoint && publicEndpoint !== endpoint
        ? new S3Client({ region, credentials, endpoint: publicEndpoint, forcePathStyle: this.forcePathStyle })
        : this.client;
  }

  async ensureBucket(): Promise<void> {
    if (this._bucketEnsured) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        const region = process.env.S3_REGION ?? 'us-east-1';
        const createCmd = new CreateBucketCommand({
          Bucket: this.bucket,
          // AWS requires a LocationConstraint for all regions except us-east-1.
          // MinIO ignores this field, so it is safe to always include it.
          ...(region !== 'us-east-1' && {
            CreateBucketConfiguration: { LocationConstraint: region as import('@aws-sdk/client-s3').BucketLocationConstraint },
          }),
        });
        await this.client.send(createCmd);
      } catch (err) {
        const code = (err as { Code?: string; name?: string }).Code ?? (err as { name?: string }).name;
        if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
          throw err;
        }
      }
    }
    this._bucketEnsured = true;
  }

  private fullKey(relativeKey: string): string {
    return this.prefix ? `${this.prefix}/${relativeKey}` : relativeKey;
  }

  private relativeKey(fullKey: string): string {
    if (this.prefix && fullKey.startsWith(`${this.prefix}/`)) {
      return fullKey.slice(this.prefix.length + 1);
    }
    return fullKey;
  }

  async searchPublicObject(filePath: string): Promise<StorageFile | null> {
    const key = this.fullKey(`public/${filePath}`);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { name: key, _bucket: this.bucket, _key: key } as S3StorageFile;
    } catch {
      return null;
    }
  }

  async downloadObject(file: StorageFile, cacheTtlSec = 3600): Promise<DownloadResult> {
    const s3File = file as S3StorageFile;
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: s3File._bucket, Key: s3File._key }),
    );
    if (!response.Body) {
      throw new ObjectNotFoundError();
    }
    return {
      contentType: response.ContentType ?? 'application/octet-stream',
      contentLength: response.ContentLength ? String(response.ContentLength) : undefined,
      cacheControl: `private, max-age=${cacheTtlSec}`,
      stream: response.Body as unknown as NodeJS.ReadableStream,
    };
  }

  async getObjectEntityUploadURL(): Promise<string> {
    await this.ensureBucket();
    const relKey = `uploads/${randomUUID()}`;
    const key = this.fullKey(relKey);
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.publicClient, command, { expiresIn: 900 });
  }

  normalizeObjectEntityPath(rawPath: string): string {
    try {
      const url = new URL(rawPath);
      let key: string;
      if (this.forcePathStyle) {
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length < 2) return rawPath;
        key = segments.slice(1).join('/');
      } else {
        key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      }
      key = this.relativeKey(key);
      return `/objects/${key}`;
    } catch {
      return rawPath;
    }
  }

  async getObjectEntityFile(objectPath: string): Promise<StorageFile> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }
    const relKey = objectPath.slice('/objects/'.length);
    const key = this.fullKey(relKey);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      throw new ObjectNotFoundError();
    }
    return { name: key, _bucket: this.bucket, _key: key } as S3StorageFile;
  }

  async deleteObject(objectPath: string): Promise<void> {
    if (!objectPath.startsWith('/objects/')) return;
    const relKey = objectPath.slice('/objects/'.length);
    const key = this.fullKey(relKey);
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      // Ignore delete errors (object may already be gone)
    }
  }

  pipeStream(stream: NodeJS.ReadableStream, res: import('express').Response): void {
    (stream as Readable).pipe(res);
  }
}
