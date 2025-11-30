// src/utils/apiResponse.ts

import {Response} from 'express';
export class ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T | undefined;
  error?: string;
  statusCode: number;

  constructor(
    statusCode: number,
    message: string,
    data?: T,
    success: boolean = true
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = success;
  }
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number = 200,
  message: string = 'Success',
  data?: T
) => {
  return res.status(statusCode).json(
    new ApiResponse(statusCode, message, data, true)
  );
};

export const sendError = (
  res: Response,
  statusCode: number = 500,
  message: string = 'Error',
  error?: string
) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error
  });
};