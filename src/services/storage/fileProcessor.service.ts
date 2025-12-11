import mammoth from 'mammoth';
import { FileProcessingError } from '@utils/errors';
import { logFile, logger } from '@/utils/logger';
import { PDFParse } from 'pdf-parse';
import multer from 'multer';
class FileProcessingService {
  // Extract text from PDF file
  async extractTextFromPDF(buffer: Buffer): Promise<{
    text: string;
    pageCount: number;
  }> {
    try {
      const parser = new PDFParse(buffer);
      const result = await parser.getText();
      const results = await parser.getInfo({ parsePageInfo: true });

      return {
        text: result.text,
        pageCount: results.total,
      };
    } catch (error) {
      logger.error('PDF text extraction failed:', error);
      throw new FileProcessingError('Failed to extract text from PDF');
    }
  }

  //   Extract text from DOCX file

  async extractTextFromDOCX(buffer: Buffer): Promise<{
    text: string;
  }> {
    try {
      const result = await mammoth.extractRawText({ buffer });

      return {
        text: result.value,
      };
    } catch (error) {
      logger.error('DOCX text extraction failed:', error);
      throw new FileProcessingError('Failed to extract text from DOCX');
    }
  }

  async extractTextFromTXT(buffer: Buffer): Promise<{
    text: string;
  }> {
    try {
      const text = buffer.toString('utf-8');

      return {
        text,
      };
    } catch (error) {
      logger.error('TXT text extraction failed:', error);
      throw new FileProcessingError('Failed to extract text from TXT file');
    }
  }

  async processFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<{
    text: string;
    pageCount?: number;
  }> {
    logger.info(`Processing file: ${file.originalname} for user: ${userId}`);

    let result: { text: string; pageCount?: number };

    try {
      switch (file.mimetype) {
        case 'application/pdf':
          result = await this.extractTextFromPDF(file.buffer);
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          result = await this.extractTextFromDOCX(file.buffer);
          break;

        case 'text/plain':
          result = await this.extractTextFromTXT(file.buffer);
          break;

        default:
          throw new FileProcessingError(
            `Unsupported file type: ${file.mimetype}`
          );
      }

      // Log successful processing
      logFile('process', userId, {
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        success: true,
      });

      logger.info(
        `File processed successfully: ${file.originalname} - ${result.text.length} characters extracted`
      );

      return result;
    } catch (error) {
      // Log failed processing
      logFile('process', userId, {
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }
}

export default new FileProcessingService();
