import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = (plain: string) => bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

export const hashToken = (token: string) => bcrypt.hash(token, SALT_ROUNDS);
export const compareToken = (token: string, hash: string) =>
  bcrypt.compare(token, hash);
