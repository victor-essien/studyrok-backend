import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger, logFile } from '@/utils/logger';
import { StorageError } from '@/utils/errors';
import crypto from 'crypto';
import path from 'path';

// Cloudflare R2 Storage Service. Handles file uploads to cloudfare R2

class R2StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    // Initialize S3 client for R2
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_PUBLIC_DOMAIN!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.R2_BUCKET_NAME!;
    this.publicUrl = process.env.R2_PUBLIC_DOMAIN!;
  }
  // Generate unique file key

  private generateFileKey(userId: string, originalFilename: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename);
    const sanitizedName = path
      .basename(originalFilename, extension)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 50);
    return `uploads/${userId}/${timestamp}-${randomString}-${sanitizedName}${extension}`;
  }

  // Upload file to R2
  async uploadFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<{
    url: string;
    key: string;
    bucket: string;
  }> {
    try {
      const fileKey = this.generateFileKey(userId, file.originalname);
      logger.info(`Uploading file to R2: ${fileKey}`);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);
      const fileUrl = this.publicUrl
        ? `${this.publicUrl}/${fileKey}`
        : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.bucketName}/${fileKey}`;

      logger.info(`File uploaded successfully to R2: ${fileKey}`);

      // Log file upload
      logFile('upload', userId, {
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        success: true,
      });

      return {
        url: fileUrl,
        key: fileKey,
        bucket: this.bucketName,
      };
    } catch (error) {
      logger.error('R2 upload failed:', error);
      // Log failed upload
      logFile('upload', userId, {
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new StorageError('Failed to upload file to storage');
    }
  }

  async getFile(fileKey: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });
      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new StorageError('File not found in storage');
      }

      // Convert strean to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunk.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('R2 file retrieval failed:', error);
      throw new StorageError('Failed to retrieve file from storage');
    }
  }

  async deleteFile(fileKey: string, userId: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });
      await this.s3Client.send(command);

      logger.info(`File deleted from R2: ${fileKey}`);

      // Log file deletion
      logFile('delete', userId, {
        filename: fileKey,
        success: true,
      });
    } catch (error) {
      logger.error(`R2 file deletion failed:`, error);

      // Log failed deletion
      logFile('delete', userId, {
        filename: fileKey,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new StorageError('Failed to delete file from storage');
    }
  }

  // Check if file exists in R2
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  // Generate presigned URL for temporary access

  async getPresignedUrl(
    fileKey: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      logger.info(`Presigned URL generated for: ${fileKey}`);

      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL:', error);
      throw new StorageError('Failed to generate file access URL');
    }
  }

  // Get file metadata

  async getFileMetadata(fileKey: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    metadata: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata || {},
      };
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw new StorageError('Failed to retrieve file metadata');
    }
  }
}

export default new R2StorageService();
