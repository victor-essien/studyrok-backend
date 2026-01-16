// src/services/text-extraction.service.ts
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import { logger } from '../utils/logger';

export class TextExtractionService {
  /**
   * Extract text from PDF
   */
  async extractFromPDF(buffer: Buffer): Promise<string> {
    try {
      logger.info('Extracting text from PDF...');

      const parser = new PDFParse(buffer);
      const data = await parser.getText();
      
      const text = data.text
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines

      logger.info(`Extracted ${text.length} characters from PDF`);

      return text;
    } catch (error) {
      logger.error('PDF extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from DOCX
   */
  async extractFromDOCX(buffer: Buffer): Promise<string> {
    try {
      logger.info('Extracting text from DOCX...');

      const result = await mammoth.extractRawText({ buffer });
      
      const text = result.value
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n');

      logger.info(`Extracted ${text.length} characters from DOCX`);

      return text;
    } catch (error) {
      logger.error('DOCX extraction failed:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  /**
   * Extract text from image using OCR
   */
  async extractFromImage(buffer: Buffer): Promise<string> {
    try {
      logger.info('Extracting text from image using OCR...');

      const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const cleanedText = text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n');

      logger.info(`Extracted ${cleanedText.length} characters from image`);

      return cleanedText;
    } catch (error) {
      logger.error('Image OCR failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Extract text based on file type
   */
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return await this.extractFromPDF(buffer);

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await this.extractFromDOCX(buffer);

      case 'text/plain':
        return buffer.toString('utf-8');

      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
        return await this.extractFromImage(buffer);

      default:
        throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
    }
  }

  /**
   * Get summary of extracted text (first 500 chars)
   */
  getSummary(text: string, maxLength: number = 500): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '...';
  }

  /**
   * Count words in text
   */
  countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Estimate reading time in minutes
   */
  estimateReadingTime(text: string): number {
    const words = this.countWords(text);
    const wordsPerMinute = 200;
    return Math.ceil(words / wordsPerMinute);
  }
}