import type { Request, Response, NextFunction } from 'express';
import { canManageTeam } from '../utils/teamAccess';

export const requireTeamManager = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const teamId = String(req.params.id ?? '');
  if (!teamId) {
    res.status(400).json({ error: 'Équipe introuvable.' });
    return;
  }
  const allowed = await canManageTeam(req.auth.userId, req.auth.role, teamId);
  if (!allowed) {
    res.status(403).json({ error: 'Réservé au leader de l’équipe ou aux responsables du labo.' });
    return;
  }
  next();
};
