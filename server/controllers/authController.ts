import type { Request, Response } from 'express';
import type { CookieOptions } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
} from '../utils/jwt';
import { writeAuditLog } from '../utils/audit';
import { isAcademicGrade, type UserRole } from '../constants/roles';
import { toPublicUserDto } from '../utils/publicUser';

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const sendValidationError = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return true;
  }
  return false;
};

export const login = async (req: Request, res: Response): Promise<void> => {
  if (sendValidationError(req, res)) {
    return;
  }
  const email = String(req.body.email).toLowerCase().trim();
  const password = String(req.body.password);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    isFirstLogin: user.isFirstLogin,
  });
  const refreshToken = signRefreshToken(user._id.toString());

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

  res.json({
    accessToken,
    token: accessToken,
    user: toPublicUserDto(user),
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!raw) {
    res.status(401).json({ error: 'Missing refresh token' });
    return;
  }
  try {
    const { sub } = verifyRefreshToken(raw);
    const user = await User.findById(sub);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    const accessToken = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      isFirstLogin: user.isFirstLogin,
    });
    res.json({
      accessToken,
      token: accessToken,
      user: toPublicUserDto(user),
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: 0 });
  res.status(204).end();
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  if (sendValidationError(req, res)) {
    return;
  }
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const currentPassword = String(req.body.currentPassword);
  const newPassword = String(req.body.newPassword);

  const user = await User.findById(req.auth.userId).select('+passwordHash');
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const beforeFirst = user.isFirstLogin;
  user.passwordHash = await hashPassword(newPassword);
  if (user.isFirstLogin) {
    user.isFirstLogin = false;
  }
  await user.save();

  await writeAuditLog({
    userId: user._id,
    action: beforeFirst ? 'AUTH_PASSWORD_CHANGED_FIRST_LOGIN' : 'AUTH_PASSWORD_CHANGED',
    targetModel: 'User',
    targetId: user._id.toString(),
    oldValue: { isFirstLogin: beforeFirst },
    newValue: { isFirstLogin: user.isFirstLogin },
    ip: req.ip,
  });

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    isFirstLogin: user.isFirstLogin,
  });
  const refreshToken = signRefreshToken(user._id.toString());
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

  res.json({
    accessToken,
    token: accessToken,
    user: toPublicUserDto(user),
  });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const user = await User.findById(req.auth.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: toPublicUserDto(user) });
};

/** Used when creating users server-side to pick a valid initial grade from role */
export const defaultGradeForRole = (role: UserRole): string | undefined => {
  if (role === 'super_admin') {
    return undefined;
  }
  if (isAcademicGrade(role)) {
    return role;
  }
  return undefined;
};

export const isRoleAllowedForNewUser = (role: UserRole): boolean => role !== 'super_admin';
