import jwt from 'jsonwebtoken';
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_EXPIRES, REFRESH_TOKEN_EXPIRES } from '@/env';


export const signAccessToken = (payload: object) => {

  return jwt.sign(payload, JWT_ACCESS_SECRET as jwt.Secret, {
    expiresIn: `1h`,
  });
}


export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, JWT_ACCESS_SECRET)
}

export const signRefreshToken = (payload: object) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '100d'})


}

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, JWT_REFRESH_SECRET)
}