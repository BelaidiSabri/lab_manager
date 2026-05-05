import type { Request, Response } from 'express';
import User from '../models/User';
import { deriveEffectiveAcademicProgram, type AcademicProgram, type UserRole } from '../constants/roles';

/** Active lab members — readable by any authenticated user (lab directory). */
export const listMemberDirectory = async (_req: Request, res: Response): Promise<void> => {
  const users = await User.find({ isActive: true })
    .select('name email role currentGrade academicProgram createdAt')
    .sort({ name: 1 })
    .lean();
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
      createdAt: u.createdAt,
    })),
  });
};
