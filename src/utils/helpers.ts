import { Response } from 'express';
import { REFRESH_TOKEN_EXPIRES } from '@/env';
import { msToMillis } from './time';

export function setRefreshCookie(res: Response, token: string) {
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: msToMillis(REFRESH_TOKEN_EXPIRES),
  };
  res.cookie('refreshToken', token, cookieOptions);
}

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
};

//  Pagination helper

export const paginate = (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
};

/**
 * Build pagination metadata
 */
export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
};
