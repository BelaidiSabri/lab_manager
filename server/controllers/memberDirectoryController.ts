import type { Request, Response } from 'express';
import User from '../models/User';
import { deriveEffectiveAcademicProgram, type AcademicProgram, type UserRole } from '../constants/roles';
import Supervision from '../models/Supervision';

/** Active lab members — readable by any authenticated user (lab directory). */
export const listMemberDirectory = async (req: Request, res: Response): Promise<void> => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.role === 'string' && req.query.role.trim()) {
    filter.role = req.query.role.trim();
  }
  if (typeof req.query.isActive === 'string') {
    filter.isActive = req.query.isActive === 'true';
  } else {
    filter.isActive = true;
  }
  if (typeof req.query.team === 'string' && req.query.team.trim()) {
    filter.teamId = req.query.team.trim();
  }
  const users = await User.find(filter)
    .select('name email role currentGrade academicProgram createdAt isActive teamId')
    .populate('teamId', 'name axis')
    .sort({ name: 1 })
    .lean();
  const userIds = users.map((u) => u._id);
  const active = await Supervision.find({
    status: 'active',
    $or: [{ supervisor: { $in: userIds } }, { supervised: { $in: userIds } }],
  })
    .select('supervisor supervised')
    .lean();
  const hasActive = new Set<string>();
  for (const row of active) {
    hasActive.add(String(row.supervisor));
    hasActive.add(String(row.supervised));
  }
  res.json({
    members: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      currentGrade: u.currentGrade,
      academicProgram: deriveEffectiveAcademicProgram({
        role: u.role as UserRole,
        academicProgram: u.academicProgram as AcademicProgram | undefined,
      }),
      isActive: u.isActive,
      team: u.teamId
        ? {
            id: String((u.teamId as { _id: unknown })._id),
            name: String((u.teamId as { name?: unknown }).name ?? ''),
          }
        : null,
      hasActiveSupervision: hasActive.has(u._id.toString()),
      createdAt: u.createdAt,
    })),
  });
};
