import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import {
  UnsupportedMediaTypeError,
  PayloadTooLargeError,
} from '@/utils/errors';

const storage = multer.memoryStorage();

// File filter to allow only specific file types

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  // Allowed file types: PDF, DOCX, TXT
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  // Allowed file extensions
  const allowedExtensions = ['.pdf', '.docx', '.txt'];

  // Check mime type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new UnsupportedMediaTypeError(
        `File type ${file.mimetype} is not supported. Allowed types: PDG, DOCX, TXT`
      )
    );
  }

  // Check file extention
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return callback(
      new UnsupportedMediaTypeError(
        `File extension ${fileExtension} is not supported. Allowed extentions: .pdf, .docx, .txt`
      )
    );
  }

  // Check for potentially dangerous file names
  if (file.originalname.includes('...') || file.originalname.includes('/')) {
    return callback(new UnsupportedMediaTypeError('Invalid file name'));
  }
  callback(null, true);
};

//  Multer Configuration

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default,
    files: 1, // One file per request
  },
});

//  Single file upload

export const uploadSingleFile = upload.single('file');

// Multiple file upload

export const uploadMultipleFiles = upload.array('files', 5); // Max 5 files

// Handle multer errors

export const handleUploadError = (
  err: any,
  req: Request,
  res: any,
  next: any
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new PayloadTooLargeError(
          `File size exceeds maximum allowed size of ${
            parseInt(process.env.MAX_FILE_SIZE || '52428800') / 1024 / 1024
          }MB`
        )
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(
        new UnsupportedMediaTypeError('Too many files. Maximum 5 files allowed')
      );
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new UnsupportedMediaTypeError(
          'Unexpected file field. Use "file" or "files" as field name '
        )
      );
    }

    return next(new UnsupportedMediaTypeError(err.message));
  }

  next(err);
};

//  Validate uploaded file

export const validateUploadedFile = (req: Request, res: any, next: any) => {
  if (!req.file && !req.files) {
    return next();
  }

  const file = req.file;

  if (file) {
    // Check if file is empty
    if (file.size === 0) {
      return next(new UnsupportedMediaTypeError('Uploaded file is empty'));
    }

    // Check file signatures for additonal security
    const buffer = file.buffer;

    // Pdf signatures: %PDF
    if (file.mimetype === 'application/pdf') {
      if (
        buffer[0] !== 0x25 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x44 ||
        buffer[3] !== 0x46
      ) {
        return next(new UnsupportedMediaTypeError('File is not a valid PDF'));
      }
    }

    // DOCX magic number: PK (ZIP format)
    if (
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        return next(new UnsupportedMediaTypeError('File is not a valid DOCX'));
      }
    }
    // Attach metadata
    (req as any).fileMetadata = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2),
      uploadedAt: new Date(),
    };
  }

  next();
};
