// src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('Async Handler Invoked', res.statusCode);
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
