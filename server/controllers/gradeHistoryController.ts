import type { Request, Response } from 'express';
import GradeHistory from '../models/GradeHistory';

export const listGradeHistory = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = await GradeHistory.find()
    .sort({ changedAt: -1 })
    .limit(limit)
    .populate('userId', 'name email currentGrade')
    .populate('concoursId', 'title targetGrade')
    .populate('changedBy', 'name email')
    .lean();
  res.json({ history: rows });
};
