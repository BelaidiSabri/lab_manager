import type { Request, Response, NextFunction } from 'express';

const FIRST_LOGIN_CODE = 'FIRST_LOGIN_PASSWORD_REQUIRED';

/**
 * Blocks API access when the user must change their password first.
 * Does not apply when `req.auth` is missing (use after `authenticate` only on protected chains).
 */
export const firstLoginGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.auth.isFirstLogin) {
    res.status(403).json({
      error: 'Password change required before using the application',
      code: FIRST_LOGIN_CODE,
    });
    return;
  }
  next();
};
