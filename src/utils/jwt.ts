import jwt from 'jsonwebtoken';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES,
} from '@/env';
import { AuthenticationError } from './errors';

export const signAccessToken = (payload: object) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET as jwt.Secret, {
    expiresIn: `1h`,
  });
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

export const signRefreshToken = (payload: object) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '100d' });
};

export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AuthenticationError('Invalid or exprired token');
  }
};
