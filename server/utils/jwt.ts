import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '../constants/roles';
import { isUserRole } from '../constants/roles';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET must be set and at least 16 characters');
  }
  return secret;
};

export type JwtPayload = { sub: string; role: UserRole };

export const signToken = (payload: JwtPayload, expiry: SignOptions['expiresIn'] = '7d'): string => {
  const options: SignOptions = { expiresIn: expiry };
  return jwt.sign({ sub: payload.sub, role: payload.role }, getSecret(), options);
};

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, getSecret()) as jwt.JwtPayload & {
    role?: string;
    sub?: string;
  };
  if (!decoded.sub || !decoded.role || !isUserRole(decoded.role)) {
    throw new Error('Invalid token payload');
  }
  return { sub: decoded.sub, role: decoded.role };
};
