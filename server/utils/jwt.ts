import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '../constants/roles';
import { isUserRole } from '../constants/roles';

const getAccessSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET must be set and at least 16 characters');
  }
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  return getAccessSecret();
};

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  isFirstLogin: boolean;
  typ: 'access';
};

export type RefreshTokenPayload = { sub: string; typ: 'refresh' };

const ACCESS_EXPIRES: SignOptions['expiresIn'] = '15m';
const REFRESH_EXPIRES: SignOptions['expiresIn'] = '7d';

export const signAccessToken = (payload: {
  sub: string;
  role: UserRole;
  isFirstLogin: boolean;
}): string => {
  const body: AccessTokenPayload = { ...payload, typ: 'access' };
  return jwt.sign(body, getAccessSecret(), { expiresIn: ACCESS_EXPIRES });
};

export const signRefreshToken = (sub: string): string => {
  const body: RefreshTokenPayload = { sub, typ: 'refresh' };
  return jwt.sign(body, getRefreshSecret(), { expiresIn: REFRESH_EXPIRES });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, getAccessSecret()) as jwt.JwtPayload & {
    sub?: string;
    role?: string;
    isFirstLogin?: boolean;
    typ?: string;
  };
  if (
    decoded.typ !== 'access' ||
    !decoded.sub ||
    !decoded.role ||
    !isUserRole(decoded.role) ||
    typeof decoded.isFirstLogin !== 'boolean'
  ) {
    throw new Error('Invalid access token payload');
  }
  return {
    sub: decoded.sub,
    role: decoded.role,
    isFirstLogin: decoded.isFirstLogin,
    typ: 'access',
  };
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, getRefreshSecret()) as jwt.JwtPayload & {
    sub?: string;
    typ?: string;
  };
  if (decoded.typ !== 'refresh' || !decoded.sub) {
    throw new Error('Invalid refresh token payload');
  }
  return { sub: decoded.sub, typ: 'refresh' };
};

export const REFRESH_COOKIE_NAME = 'refreshToken';
