import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { z } from 'zod';
import User from '../models/User';
import Profile from '../models/Profile';
import Supervision from '../models/Supervision';
import GradeHistory from '../models/GradeHistory';
import { writeAuditLog } from '../utils/audit';
import { hashPassword } from '../utils/password';
import type { UserRole } from '../constants/roles';
import {
  deriveEffectiveAcademicProgram,
  isAcademicGrade,
  isAcademicProgram,
  isUserRole,
  type AcademicProgram,
} from '../constants/roles';
import { defaultGradeForRole, isRoleAllowedForNewUser } from './authController';
import { toPublicUserDto } from '../utils/publicUser';

const publicationSchema = z.object({
  title: z.string().min(1),
  year: z.number().optional(),
  venue: z.string().optional(),
});

const patchMeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
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
  profile: z
    .object({
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
    })
    .optional(),
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

  const beforeUser = {
    name: user.name,
  };

  const { name, academicProfile, profile } = parsed.data;
  if (name !== undefined) {
    user.name = name;
  }
  await user.save();

  let profileDoc = await Profile.findOne({ userId: user._id });
  if (!profileDoc) {
    profileDoc = await Profile.create({ userId: user._id, academicProfile: {} });
  }

  const beforeProfile = {
    academicProfile: profileDoc.academicProfile
      ? JSON.parse(JSON.stringify(profileDoc.academicProfile))
      : {},
    photo: profileDoc.photo,
    bio: profileDoc.bio,
    researchAxe: profileDoc.researchAxe,
    institution: profileDoc.institution,
    socialLinks: profileDoc.socialLinks ? JSON.parse(JSON.stringify(profileDoc.socialLinks)) : [],
    diplomas: profileDoc.diplomas ? JSON.parse(JSON.stringify(profileDoc.diplomas)) : [],
  };

  if (academicProfile !== undefined) {
    const base = JSON.parse(JSON.stringify(profileDoc.academicProfile ?? {})) as Record<string, unknown>;
    profileDoc.academicProfile = {
      ...base,
      ...academicProfile,
      publications:
        academicProfile.publications !== undefined
          ? academicProfile.publications
          : ((base.publications as unknown[]) ?? []),
    };
  }
  if (profile !== undefined) {
    if (profile.photo !== undefined) profileDoc.photo = profile.photo;
    if (profile.bio !== undefined) profileDoc.bio = profile.bio;
    if (profile.researchAxe !== undefined) profileDoc.researchAxe = profile.researchAxe;
    if (profile.institution !== undefined) profileDoc.institution = profile.institution;
    if (profile.socialLinks !== undefined) profileDoc.set('socialLinks', profile.socialLinks);
    if (profile.diplomas !== undefined) profileDoc.set('diplomas', profile.diplomas);
  }
  await profileDoc.save();

  await writeAuditLog({
    userId: user._id,
    action: 'USER_PROFILE_UPDATED',
    targetModel: 'User',
    targetId: user._id.toString(),
    oldValue: { user: beforeUser, profile: beforeProfile },
    newValue: {
      name: user.name,
      profile: {
        academicProfile: profileDoc.academicProfile,
        photo: profileDoc.photo,
        bio: profileDoc.bio,
        researchAxe: profileDoc.researchAxe,
        institution: profileDoc.institution,
        socialLinks: profileDoc.socialLinks,
        diplomas: profileDoc.diplomas,
      },
    },
    ip: req.ip,
  });

  res.json({
    user: toPublicUserDto(user),
    profile: profileDoc,
  });
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const users = await User.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.json({
    users: users.map((u) => ({
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
      createdAt: u.createdAt,
    })),
  });
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const name = String(req.body.name).trim();
  const email = String(req.body.email).toLowerCase().trim();
  const password = String(req.body.password);
  const role = req.body.role as string;
  const currentGradeRaw = req.body.currentGrade as string | undefined;

  if (!isUserRole(role) || !isRoleAllowedForNewUser(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  let currentGrade = currentGradeRaw?.trim();
  if (!currentGrade) {
    currentGrade = defaultGradeForRole(role);
  }
  if (role !== 'super_admin' && (!currentGrade || !isAcademicGrade(currentGrade))) {
    res.status(400).json({ error: 'currentGrade must be a valid academic grade for this role' });
    return;
  }

  const apRaw = req.body.academicProgram as string | undefined;
  let academicProgram: AcademicProgram = 'none';
  if (apRaw && isAcademicProgram(apRaw)) {
    academicProgram = apRaw;
  } else if (role === 'master_student') {
    academicProgram = 'master';
  } else if (role === 'doctorant') {
    academicProgram = 'doctorate';
  }

  const passwordHash = await hashPassword(password);
  try {
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      currentGrade: role === 'super_admin' ? undefined : currentGrade,
      academicProgram: role === 'super_admin' ? 'none' : academicProgram,
      isFirstLogin: true,
      createdBy: req.auth.userId,
    });

    await Profile.create({ userId: user._id, academicProfile: {} });

    await writeAuditLog({
      userId: req.auth.userId,
      action: 'USER_CREATED',
      targetModel: 'User',
      targetId: user._id.toString(),
      newValue: { email, role, name },
      ip: req.ip,
    });

    res.status(201).json({ user: toPublicUserDto(user) });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    throw e;
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const id = req.params.id === 'me' ? req.auth.userId : req.params.id;
  const user = await User.findById(id).lean();
  if (!user || !user.isActive) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const includeSupervisions = req.query.include === 'supervisions';
  let supervisions: {
    asSupervisor: unknown[];
    asSupervised: unknown[];
  } | undefined;
  if (includeSupervisions) {
    const [asSupervisor, asSupervised] = await Promise.all([
      Supervision.find({ supervisor: user._id })
        .populate('supervised', 'name email role')
        .lean(),
      Supervision.find({ supervised: user._id })
        .populate('supervisor', 'name email role')
        .lean(),
    ]);
    supervisions = { asSupervisor, asSupervised };
  }

  const profile = await Profile.findOne({ userId: user._id }).lean();

  const isSelf = req.auth.userId === user._id.toString();
  const isAdmin = req.auth.role === 'super_admin';
  const canSeeGradeHistory = isAdmin || isSelf;
  const gradeHistory = canSeeGradeHistory
    ? await GradeHistory.find({ userId: user._id })
        .sort({ changedAt: -1 })
        .populate('concoursId', 'title targetGrade')
        .populate('changedBy', 'name email')
        .lean()
    : [];

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
      ...(isAdmin || isSelf
        ? {
            isFirstLogin: user.isFirstLogin,
            isActive: user.isActive,
            createdAt: user.createdAt,
          }
        : {}),
    },
    profile,
    ...(canSeeGradeHistory ? { gradeHistory } : {}),
    ...(supervisions ? { supervisions } : {}),
  });
};

const promoteUserSchema = z.object({
  reason: z.enum(['graduation', 'thesis_defense']),
  date: z.string().min(1),
});

export const promoteUser = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Non autorisé.' });
    return;
  }

  const parsed = promoteUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Données de promotion invalides.' });
    return;
  }

  const target = await User.findById(req.params.id);
  if (!target || !target.isActive || (target.role !== 'master_student' && target.role !== 'doctorant')) {
    res.status(403).json({
      error: 'Seuls les comptes actifs de type Étudiant master ou Doctorant peuvent être promus.',
    });
    return;
  }

  const { reason, date } = parsed.data;
  if (
    (target.role === 'master_student' && reason !== 'graduation') ||
    (target.role === 'doctorant' && reason !== 'thesis_defense')
  ) {
    res.status(400).json({ error: 'Le motif ne correspond pas au rôle de ce membre.' });
    return;
  }

  const changedAt = new Date(date);
  const now = new Date();
  if (Number.isNaN(changedAt.getTime())) {
    res.status(400).json({ error: 'Date de promotion invalide.' });
    return;
  }
  if (changedAt.getTime() > now.getTime()) {
    res.status(400).json({ error: 'La date de promotion ne peut pas être dans le futur.' });
    return;
  }

  const nextRole: UserRole = target.role === 'master_student' ? 'doctorant' : 'docteur';
  const nextGrade = nextRole;
  const oldRole = target.role;
  const oldGrade = target.currentGrade ?? null;
  const actorUserId = req.auth.userId;
  const ip = Array.isArray(req.ip) ? req.ip[0] : req.ip;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      target.role = nextRole;
      target.currentGrade = nextGrade;
      target.academicProgram = nextRole === 'doctorant' ? 'doctorate' : 'none';
      await target.save({ session });

      await GradeHistory.create(
        [
          {
            userId: target._id,
            oldGrade: oldGrade ?? '(none)',
            newGrade: nextGrade,
            concoursId: null,
            reason,
            changedBy: actorUserId,
            changedAt,
          },
        ],
        { session }
      );

      await writeAuditLog({
        userId: actorUserId,
        action: 'MANUAL_PROMOTION',
        targetModel: 'User',
        targetId: target._id.toString(),
        oldValue: { role: oldRole, currentGrade: oldGrade },
        newValue: { role: nextRole, currentGrade: nextGrade, reason, changedAt },
        ip,
        session,
      });
    });
  } catch {
    res.status(500).json({ error: 'Échec de la promotion. Aucune modification n’a été appliquée.' });
    return;
  } finally {
    await session.endSession();
  }

  res.json({
    ok: true,
    user: toPublicUserDto(target),
  });
};

export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  if (id === req.auth.userId) {
    res.status(400).json({ error: 'Cannot deactivate your own account' });
    return;
  }
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (user.role === 'super_admin') {
    res.status(400).json({ error: 'Cannot deactivate super admin' });
    return;
  }
  const oldActive = user.isActive;
  user.isActive = false;
  await user.save();
  const ip = Array.isArray(req.ip) ? req.ip[0] : req.ip;
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'USER_DEACTIVATED',
    targetModel: 'User',
    targetId: String(id),
    oldValue: { isActive: oldActive },
    newValue: { isActive: false },
    ip,
  });
  res.json({ ok: true });
};

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  currentGrade: z.string().optional(),
  academicProgram: z.enum(['none', 'master', 'doctorate']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (target.role === 'super_admin' && req.auth.userId !== target._id.toString()) {
    res.status(400).json({ error: 'Cannot modify another super admin account' });
    return;
  }

  const before = {
    name: target.name,
    email: target.email,
    role: target.role,
    currentGrade: target.currentGrade,
    academicProgram: target.academicProgram,
    isActive: target.isActive,
  };

  const { name, email, role, currentGrade, academicProgram, isActive, password } = parsed.data;
  if (name !== undefined) target.name = name;
  if (email !== undefined) target.email = email.toLowerCase().trim();
  if (role !== undefined) {
    if (!isUserRole(role) || role === 'super_admin') {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    target.role = role;
  }
  if (currentGrade !== undefined) {
    if (currentGrade === '' || currentGrade === null) {
      target.set('currentGrade', undefined);
    } else if (isAcademicGrade(currentGrade)) {
      target.currentGrade = currentGrade;
    } else {
      res.status(400).json({ error: 'Invalid currentGrade' });
      return;
    }
  }
  if (academicProgram !== undefined) {
    if (!isAcademicProgram(academicProgram)) {
      res.status(400).json({ error: 'Invalid academicProgram' });
      return;
    }
    target.academicProgram = academicProgram;
  }
  if (isActive !== undefined) {
    if (!isActive && target.role === 'super_admin') {
      res.status(400).json({ error: 'Cannot deactivate super admin' });
      return;
    }
    target.isActive = isActive;
  }
  if (password !== undefined) {
    target.passwordHash = await hashPassword(password);
    target.isFirstLogin = true;
  }

  try {
    await target.save();
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    throw e;
  }

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'USER_UPDATED',
    targetModel: 'User',
    targetId: target._id.toString(),
    oldValue: before,
    newValue: {
      name: target.name,
      email: target.email,
      role: target.role,
      currentGrade: target.currentGrade,
      academicProgram: target.academicProgram,
      isActive: target.isActive,
      passwordReset: password !== undefined,
    },
    ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
  });

  res.json({ user: toPublicUserDto(target) });
};
