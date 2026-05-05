import type { Request, Response, NextFunction } from 'express';
import { roleRank, type UserRole } from '../constants/roles';

/** Require an exact role match (use after `authenticate`). */
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

/**
 * Require the authenticated user to be at or above a minimum role in the hierarchy
 * (lower `roleRank` index = more privileged).
 */
export const requireMinimumRole =
  (minRole: UserRole) => (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const u = roleRank(req.auth.role);
    const m = roleRank(minRole);
    if (u < 0 || m < 0 || u > m) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
