import type { Request, Response } from 'express';
import { z } from 'zod';
import User from '../models/User';
import { writeAuditLog } from '../utils/audit';
import type { UserRole } from '../constants/roles';

const publicationSchema = z.object({
  title: z.string().min(1),
  year: z.number().optional(),
  venue: z.string().optional(),
});

const patchMeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  academicProfile: z
    .object({
      title: z.string().max(200).optional(),
      department: z.string().max(200).optional(),
      biography: z.string().max(8000).optional(),
      orcid: z.string().max(80).optional(),
      specialties: z.array(z.string().min(1).max(120)).max(40).optional(),
      researchInterests: z.array(z.string().min(1).max(200)).max(40).optional(),
      googleScholarUrl: z.string().max(512).optional(),
      researchgateUrl: z.string().max(512).optional(),
      hIndex: z.union([z.number().int().nonnegative().max(99999), z.null()]).optional(),
      citationCount: z.union([z.number().int().nonnegative().max(99999999), z.null()]).optional(),
      publications: z.array(publicationSchema).optional(),
    })
    .optional(),
});

const toPublicUser = (doc: {
  _id: { toString: () => string };
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  academicProfile?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: doc._id.toString(),
  email: doc.email,
  firstName: doc.firstName,
  lastName: doc.lastName,
  role: doc.role,
  academicProfile: doc.academicProfile ?? {},
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const parsed = patchMeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await User.findById(req.auth.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const before = {
    firstName: user.firstName,
    lastName: user.lastName,
    academicProfile: user.academicProfile ? JSON.parse(JSON.stringify(user.academicProfile)) : {},
  };

  const { firstName, lastName, academicProfile } = parsed.data;
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (academicProfile !== undefined) {
    const base = JSON.parse(JSON.stringify(user.academicProfile ?? {})) as Record<string, unknown>;
    user.academicProfile = {
      ...base,
      ...academicProfile,
      publications:
        academicProfile.publications !== undefined
          ? academicProfile.publications
          : ((base.publications as unknown[]) ?? []),
    };
  }

  await user.save();

  const after = {
    firstName: user.firstName,
    lastName: user.lastName,
    academicProfile: user.academicProfile ? JSON.parse(JSON.stringify(user.academicProfile)) : {},
  };

  await writeAuditLog({
    actorId: user._id,
    action: 'USER_PROFILE_UPDATED',
    resourceType: 'User',
    resourceId: user._id.toString(),
    changes: { before, after },
    ip: req.ip,
  });

  res.json({ user: toPublicUser(user) });
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth || req.auth.role !== 'administrateur') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const users = await User.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      createdAt: u.createdAt,
    })),
  });
};
