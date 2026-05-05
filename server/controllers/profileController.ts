import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Profile from '../models/Profile';
import User from '../models/User';
import { writeAuditLog } from '../utils/audit';
import { deriveEffectiveAcademicProgram, type UserRole, type AcademicProgram } from '../constants/roles';

function paramUserId(req: Request): string | null {
  const raw = req.params.userId;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

const updateSchema = z.object({
  photo: z.string().max(2048).optional(),
  bio: z.string().max(8000).optional(),
  researchAxe: z.string().max(500).optional(),
  institution: z.string().max(300).optional(),
  socialLinks: z
    .array(z.object({ label: z.string().max(100).optional(), url: z.string().max(2048) }))
    .optional(),
  diplomas: z
    .array(
      z.object({
        title: z.string().min(1),
        year: z.number().optional(),
        institution: z.string().optional(),
      })
    )
    .optional(),
});

export const getProfileByUserId = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = paramUserId(req);
  if (!userId) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }
  const user = await User.findById(userId).lean();
  if (!user || !user.isActive) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const profile = await Profile.findOne({ userId: user._id }).lean();
  res.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      currentGrade: user.currentGrade,
      academicProgram: deriveEffectiveAcademicProgram({
        role: user.role as UserRole,
        academicProgram: user.academicProgram as AcademicProgram | undefined,
      }),
    },
    profile,
  });
};

export const updateProfileByUserId = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = paramUserId(req);
  if (!userId) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }
  if (req.auth.userId !== userId && req.auth.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  let profileDoc = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  if (!profileDoc) {
    profileDoc = await Profile.create({ userId: new mongoose.Types.ObjectId(userId), academicProfile: {} });
  }

  const before = JSON.parse(JSON.stringify(profileDoc.toObject()));
  const p = parsed.data;
  if (p.photo !== undefined) profileDoc.photo = p.photo;
  if (p.bio !== undefined) profileDoc.bio = p.bio;
  if (p.researchAxe !== undefined) profileDoc.researchAxe = p.researchAxe;
  if (p.institution !== undefined) profileDoc.institution = p.institution;
  if (p.socialLinks !== undefined) profileDoc.set('socialLinks', p.socialLinks);
  if (p.diplomas !== undefined) profileDoc.set('diplomas', p.diplomas);
  await profileDoc.save();

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROFILE_UPDATED',
    targetModel: 'Profile',
    targetId: profileDoc._id.toString(),
    oldValue: before,
    newValue: profileDoc.toObject(),
    ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
  });

  res.json({ profile: profileDoc });
};
