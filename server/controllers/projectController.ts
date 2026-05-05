import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Project from '../models/Project';
import { writeAuditLog } from '../utils/audit';
import { PROJECT_STATUSES } from '../models/Project';

export const listProjects = async (_req: Request, res: Response): Promise<void> => {
  const projects = await Project.find()
    .sort({ updatedAt: -1 })
    .populate('leader', 'name email')
    .populate('members', 'name email')
    .limit(100)
    .lean();
  res.json({ projects });
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const leader = String(req.body.leader ?? req.auth.userId);
  if (!mongoose.Types.ObjectId.isValid(leader)) {
    res.status(400).json({ error: 'Invalid leader' });
    return;
  }

  const members = Array.isArray(req.body.members)
    ? (req.body.members as string[]).filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  const doc = await Project.create({
    title: String(req.body.title).trim(),
    description: req.body.description != null ? String(req.body.description) : '',
    leader,
    members,
    status:
      req.body.status != null && PROJECT_STATUSES.includes(req.body.status)
        ? req.body.status
        : 'active',
    startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
    endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    relatedPublications: Array.isArray(req.body.relatedPublications)
      ? req.body.relatedPublications.filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      : [],
  });

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_CREATED',
    targetModel: 'Project',
    targetId: doc._id.toString(),
    newValue: { title: doc.title },
    ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
  });

  res.status(201).json({ project: doc });
};

export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  const doc = await Project.findById(req.params.id)
    .populate('leader', 'name email')
    .populate('members', 'name email')
    .populate('relatedPublications')
    .lean();
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ project: doc });
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const doc = await Project.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const leaderId = doc.leader.toString();
  const memberIds = doc.members.map((m) => m.toString());
  const canEdit =
    req.auth.role === 'super_admin' ||
    leaderId === req.auth.userId ||
    memberIds.includes(req.auth.userId);
  if (!canEdit) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const before = doc.toObject();
  if (req.body.title != null) doc.title = String(req.body.title).trim();
  if (req.body.description != null) doc.description = String(req.body.description);
  if (req.body.status != null && PROJECT_STATUSES.includes(req.body.status)) doc.status = req.body.status;
  if (req.body.startDate != null) doc.startDate = new Date(req.body.startDate);
  if (req.body.endDate != null) doc.endDate = new Date(req.body.endDate);
  if (req.body.members != null && Array.isArray(req.body.members)) {
    doc.members = req.body.members
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));
  }
  if (req.body.relatedPublications != null && Array.isArray(req.body.relatedPublications)) {
    doc.relatedPublications = req.body.relatedPublications
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));
  }
  if (req.body.leader != null && req.auth.role === 'super_admin') {
    const l = String(req.body.leader);
    if (mongoose.Types.ObjectId.isValid(l)) doc.leader = new mongoose.Types.ObjectId(l);
  }
  await doc.save();

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_UPDATED',
    targetModel: 'Project',
    targetId: doc._id.toString(),
    oldValue: before,
    newValue: doc.toObject(),
    ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
  });

  res.json({ project: doc });
};

export const projectValidators = [
  body('title').isString().trim().isLength({ min: 1, max: 300 }),
  body('description').optional().isString(),
  body('leader').optional().isMongoId(),
  body('members').optional().isArray(),
  body('status').optional().isIn([...PROJECT_STATUSES]),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('relatedPublications').optional().isArray(),
];
