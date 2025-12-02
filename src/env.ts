import dotenv from 'dotenv';

dotenv.config()

export const PORT = process.env.PORT! || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
export const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '1h'
export const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '100d'
export const DATABASE_URL = process.env.DATABASE_URL || ''