import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName = '';
  private publicUrlBase = '';
  private readonly useS3: boolean;
  private readonly uploadRoot = join(process.cwd(), 'uploads');

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('YC_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('YC_SECRET_KEY') || '';
    this.bucketName = this.configService.get<string>('YC_BUCKET') || 'eduplay-media';

    this.useS3 = Boolean(accessKeyId && secretAccessKey);

    if (!this.useS3) {
      this.logger.warn(
        'YC_KEY_ID / YC_SECRET_KEY не заданы — файлы сохраняются локально в uploads/',
      );
      return;
    }

    const region = this.configService.get<string>('YC_REGION') || 'ru-central1';
    const endpoint =
      this.configService.get<string>('YC_ENDPOINT') ||
      'https://storage.yandexcloud.net';

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    this.publicUrlBase = (
      this.configService.get<string>('YC_PUBLIC_URL_BASE') ||
      `${endpoint.replace(/\/+$/, '')}/${this.bucketName}`
    ).replace(/\/+$/, '');

    this.logger.log(
      `Yandex Object Storage: bucket=${this.bucketName}, endpoint=${endpoint}`,
    );
  }

  usesObjectStorage(): boolean {
    return this.useS3;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    filenameBase?: string,
  ): Promise<{ url: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Пустой файл');
    }

    const ext = this.extensionFromMimetype(file.mimetype);
    const filename = filenameBase ? `${filenameBase}${ext}` : `${randomUUID()}${ext}`;
    const key = `${folder}/${filename}`;

    if (this.useS3 && this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      return { url: `${this.publicUrlBase}/${key}` };
    }

    const dir = join(this.uploadRoot, folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, filename), file.buffer);

    return { url: `/uploads/${folder}/${filename}` };
  }

  async deleteByUrl(url: string | null | undefined): Promise<void> {
    if (!url?.trim()) {
      return;
    }

    if (this.useS3 && this.s3Client) {
      const key = this.keyFromPublicUrl(url);
      if (!key) {
        return;
      }
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
        );
      } catch (err) {
        this.logger.warn(`Не удалось удалить объект: ${key}`, err);
      }
      return;
    }

    if (!url.startsWith('/uploads/')) {
      return;
    }
    const relative = url.replace(/^\/uploads\//, '');
    try {
      await fs.unlink(join(this.uploadRoot, relative));
    } catch {
      // уже удалён
    }
  }

  private keyFromPublicUrl(url: string): string | null {
    const prefix = `${this.publicUrlBase}/`;
    if (!url.startsWith(prefix)) {
      return null;
    }
    return url.slice(prefix.length);
  }

  private extensionFromMimetype(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return map[mimetype] || '.bin';
  }
}
