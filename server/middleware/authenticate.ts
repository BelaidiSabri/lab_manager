import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

/** Validates Bearer access JWT and attaches `req.auth`. */
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
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      isFirstLogin: payload.isFirstLogin,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
};
