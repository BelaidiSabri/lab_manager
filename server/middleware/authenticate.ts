import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import type { UserRole } from '../constants/roles';

/** Sets `req.auth` when a valid Bearer token is present; never sends 401. */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
  } catch {
    /* invalid token on register — ignore */
  }
  next();
};

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }
    const payload = verifyToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRoles =
  (...allowed: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowed.includes(req.auth.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
