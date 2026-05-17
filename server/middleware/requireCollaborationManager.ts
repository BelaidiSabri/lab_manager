import type { Request, Response, NextFunction } from 'express';
import { canManageCollaboration } from '../utils/teamAccess';

export const requireCollaborationManager = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const teamId = String(req.params.id ?? '');
  const partnerId = String(req.params.partnerId ?? '');
  if (!teamId || !partnerId) {
    res.status(400).json({ error: 'Collaboration introuvable.' });
    return;
  }
  const allowed = await canManageCollaboration(req.auth.userId, req.auth.role, teamId, partnerId);
  if (!allowed) {
    res.status(403).json({
      error: 'Réservé aux leaders des deux équipes ou aux responsables du labo.',
    });
    return;
  }
  next();
};
