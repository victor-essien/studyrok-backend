import { Response } from 'express';
import { REFRESH_TOKEN_EXPIRES } from '@/env';
import { msToMillis } from './time';

export function setRefreshCookie(res: Response, token: string) {
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth/refresh',
    maxAge: msToMillis(REFRESH_TOKEN_EXPIRES),
  };
  res.cookie('refreshToken', token, cookieOptions);
}

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/auth/refresh',
  });
};
