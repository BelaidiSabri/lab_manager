import type { Request, Response } from 'express';
import { z } from 'zod';
import User from '../models/User';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { writeAuditLog } from '../utils/audit';
import { isUserRole, type UserRole } from '../constants/roles';

const emailPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerBootstrapSchema = emailPasswordSchema.extend({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

const registerByAdminSchema = registerBootstrapSchema.extend({
  role: z.string().refine(isUserRole, { message: 'Invalid role' }),
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

export const getBootstrap = async (_req: Request, res: Response): Promise<void> => {
  const count = await User.countDocuments();
  res.json({ needsBootstrap: count === 0 });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const count = await User.countDocuments();

  if (count === 0) {
    const parsed = registerBootstrapSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { email, password, firstName, lastName } = parsed.data;
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'administrateur' as const,
      academicProfile: {},
    });
    await writeAuditLog({
      actorId: user._id,
      action: 'USER_REGISTERED_BOOTSTRAP',
      resourceType: 'User',
      resourceId: user._id.toString(),
      changes: { email, role: 'administrateur' },
      ip: req.ip,
    });
    const token = signToken({ sub: user._id.toString(), role: user.role });
    res.status(201).json({ token, user: toPublicUser(user) });
    return;
  }

  if (!req.auth || req.auth.role !== 'administrateur') {
    res.status(403).json({ error: 'Only an administrator can create new accounts' });
    return;
  }

  const parsed = registerByAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, firstName, lastName, role } = parsed.data;
  const passwordHash = await hashPassword(password);
  try {
    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      academicProfile: {},
    });
    await writeAuditLog({
      actorId: req.auth.userId,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: user._id.toString(),
      changes: { email, role },
      ip: req.ip,
    });
    res.status(201).json({ user: toPublicUser(user) });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    throw e;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = emailPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const token = signToken({ sub: user._id.toString(), role: user.role });
  res.json({ token, user: toPublicUser(user) });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const user = await User.findById(req.auth.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: toPublicUser(user) });
};
