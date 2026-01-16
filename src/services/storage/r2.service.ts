// import {
//   S3Client,
//   PutObjectCommand,
//   GetObjectCommand,
//   DeleteObjectCommand,
//   HeadObjectCommand,
// } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import { logger, logFile } from '@/utils/logger';
// import { StorageError } from '@/utils/errors';
// import crypto from 'crypto';
// import path from 'path';

// interface UploadFileRequest {
//   key: string;
//   file: Buffer;
//   contentType: string;
//   metadata?: Record<string, string>;
// }

// interface UploadResult {
//   key: string;
//   publicUrl?: string;
//   etag?: string;
// }

// // Cloudflare R2 Storage Service. Handles file uploads to cloudfare R2

// export class R2StorageService {
//   private s3Client: S3Client;
//   private bucketName: string;
//   private publicUrl: string;

//   constructor() {
//     // Initialize S3 client for R2
//     this.s3Client = new S3Client({
//       region: 'auto',
//       endpoint: process.env.R2_PUBLIC_DOMAIN!,
//       credentials: {
//         accessKeyId: process.env.R2_ACCESS_KEY_ID!,
//         secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
//       },
//     });
//     this.bucketName = process.env.R2_BUCKET_NAME!;
//     this.publicUrl = process.env.R2_PUBLIC_DOMAIN!;
//   }
//   // Generate unique file key

//   private generateFileKey(userId: string, originalFilename: string): string {
//     const timestamp = Date.now();
//     const randomString = crypto.randomBytes(8).toString('hex');
//     const extension = path.extname(originalFilename);
//     const sanitizedName = path
//       .basename(originalFilename, extension)
//       .replace(/[^a-zA-Z0-9-_]/g, '-')
//       .substring(0, 50);
//     return `uploads/${userId}/${timestamp}-${randomString}-${sanitizedName}${extension}`;
//   }

//   // Upload file to R2
//   // async uploadFile(
//   //   file: Express.Multer.File,
//   //   userId: string
//   // ): Promise<{
//   //   url: string;
//   //   key: string;
//   //   bucket: string;
//   // }> {
//   //   try {
//   //     const fileKey = this.generateFileKey(userId, file.originalname);
//   //     logger.info(`Uploading file to R2: ${fileKey}`);

//   //     const command = new PutObjectCommand({
//   //       Bucket: this.bucketName,
//   //       Key: fileKey,
//   //       Body: file.buffer,
//   //       ContentType: file.mimetype,
//   //       Metadata: {
//   //         originalName: file.originalname,
//   //         userId,
//   //         uploadedAt: new Date().toISOString(),
//   //       },
//   //     });

//   //     await this.s3Client.send(command);
//   //     const fileUrl = this.publicUrl
//   //       ? `${this.publicUrl}/${fileKey}`
//   //       : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.bucketName}/${fileKey}`;

//   //     logger.info(`File uploaded successfully to R2: ${fileKey}`);

//   //     // Log file upload
//   //     logFile('upload', userId, {
//   //       filename: file.originalname,
//   //       size: file.size,
//   //       mimeType: file.mimetype,
//   //       success: true,
//   //     });

//   //     return {
//   //       url: fileUrl,
//   //       key: fileKey,
//   //       bucket: this.bucketName,
//   //     };
//   //   } catch (error) {
//   //     logger.error('R2 upload failed:', error);
//   //     // Log failed upload
//   //     logFile('upload', userId, {
//   //       filename: file.originalname,
//   //       size: file.size,
//   //       mimeType: file.mimetype,
//   //       success: false,
//   //       error: error instanceof Error ? error.message : 'Unknown error',
//   //     });

//   //     throw new StorageError('Failed to upload file to storage');
//   //   }
//   // }

//   async getFile(fileKey: string): Promise<Buffer> {
//     try {
//       const command = new GetObjectCommand({
//         Bucket: this.bucketName,
//         Key: fileKey,
//       });
//       const response = await this.s3Client.send(command);

//       if (!response.Body) {
//         throw new StorageError('File not found in storage');
//       }

//       // Convert strean to buffer
//       const chunks: Uint8Array[] = [];
//       for await (const chunk of response.Body as any) {
//         chunk.push(chunk);
//       }
//       return Buffer.concat(chunks);
//     } catch (error) {
//       logger.error('R2 file retrieval failed:', error);
//       throw new StorageError('Failed to retrieve file from storage');
//     }
//   }

//   async deleteFile(fileKey: string, userId: string): Promise<void> {
//     try {
//       const command = new DeleteObjectCommand({
//         Bucket: this.bucketName,
//         Key: fileKey,
//       });
//       await this.s3Client.send(command);

//       logger.info(`File deleted from R2: ${fileKey}`);

//       // Log file deletion
//       logFile('delete', userId, {
//         filename: fileKey,
//         success: true,
//       });
//     } catch (error) {
//       logger.error(`R2 file deletion failed:`, error);

//       // Log failed deletion
//       logFile('delete', userId, {
//         filename: fileKey,
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error',
//       });

//       throw new StorageError('Failed to delete file from storage');
//     }
//   }

//   // Check if file exists in R2
//   async fileExists(fileKey: string): Promise<boolean> {
//     try {
//       const command = new HeadObjectCommand({
//         Bucket: this.bucketName,
//         Key: fileKey,
//       });

//       await this.s3Client.send(command);
//       return true;
//     } catch (error: any) {
//       if (error.name === 'NotFound') {
//         return false;
//       }
//       throw error;
//     }
//   }

//   // Generate presigned URL for temporary access

//   async getPresignedUrl(
//     fileKey: string,
//     expiresIn: number = 3600
//   ): Promise<string> {
//     try {
//       const command = new GetObjectCommand({
//         Bucket: this.bucketName,
//         Key: fileKey,
//       });

//       const url = await getSignedUrl(this.s3Client, command, { expiresIn });

//       logger.info(`Presigned URL generated for: ${fileKey}`);

//       return url;
//     } catch (error) {
//       logger.error('Failed to generate presigned URL:', error);
//       throw new StorageError('Failed to generate file access URL');
//     }
//   }

//   // Get file metadata

//   async getFileMetadata(fileKey: string): Promise<{
//     size: number;
//     contentType: string;
//     lastModified: Date;
//     metadata: Record<string, string>;
//   }> {
//     try {
//       const command = new HeadObjectCommand({
//         Bucket: this.bucketName,
//         Key: fileKey,
//       });

//       const response = await this.s3Client.send(command);

//       return {
//         size: response.ContentLength || 0,
//         contentType: response.ContentType || 'application/octet-stream',
//         lastModified: response.LastModified || new Date(),
//         metadata: response.Metadata || {},
//       };
//     } catch (error) {
//       logger.error('Failed to get file metadata:', error);
//       throw new StorageError('Failed to retrieve file metadata');
//     }
//   }
// }



// src/services/r2.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger, logFile } from '@/utils/logger';
import { StorageError } from '@/utils/errors';

interface UploadFileRequest {
  key: string;
  file: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

interface UploadResult {
  key: string;
  publicUrl?: string | undefined;
  etag?: string | undefined;
}

export class R2Service {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    // Cloudflare R2 is S3-compatible
    this.s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto'
      endpoint: process.env.R2_PUBLIC_DOMAIN!, // e.g., https://abc123.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      }
    });

    this.bucketName = process.env.R2_BUCKET_NAME!;
    this.publicUrl = process.env.R2_PUBLIC_DOMAIN || ''; // Optional: public domain if configured
  }

  /**
   * Upload file to R2
   */
  async uploadFile(request: UploadFileRequest): Promise<UploadResult> {
    const { key, file, contentType, metadata } = request;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
        // Optional: Set cache control
        CacheControl: 'max-age=31536000' // Cache for 1 year
      });

      const response = await this.s3Client.send(command);

      logger.info(`File uploaded to R2: ${key}`);

      return {
        key,
        publicUrl: this.publicUrl ? `${this.publicUrl}/${key}` : undefined,
        etag: response.ETag 
      };
    } catch (error) {
      logger.error('R2 upload failed:', error);
      throw new StorageError('Failed to upload file to storage');
    }
  }

  /**
   * Generate signed URL for private file access
   * This is the RECOMMENDED approach for security
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn // Default: 1 hour
      });

      logger.info(`Generated signed URL for: ${key} (expires in ${expiresIn}s)`);

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw new StorageError('Failed to generate access URL');
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata
      };
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw new StorageError('Failed to get file information');
    }
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);

      logger.info(`File deleted from R2: ${key}`);
    } catch (error) {
      logger.error('R2 delete failed:', error);
      throw new StorageError('Failed to delete file from storage');
    }
  }

  /**
   * Download file from R2 (used for text extraction)
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('R2 download failed:', error);
      throw new StorageError('Failed to download file');
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get public URL (if bucket has public access configured)
   * NOT RECOMMENDED for private notes
   */
  getPublicUrl(key: string): string {
    if (!this.publicUrl) {
      throw new StorageError('Public URL not configured');
    }
    return `${this.publicUrl}/${key}`;
  }
}