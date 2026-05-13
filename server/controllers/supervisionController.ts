import type { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Supervision, { SUPERVISION_STATUSES, SUPERVISION_TYPES } from '../models/Supervision';
import User from '../models/User';
import { isStudentTrackRole, isUserRole, roleRank, type UserRole } from '../constants/roles';
import { writeAuditLog } from '../utils/audit';

function ipFromReq(req: Request): string | undefined {
  return Array.isArray(req.ip) ? req.ip[0] : req.ip;
}

export const listSupervisions = async (req: Request, res: Response): Promise<void> => {
  const filter: Record<string, string> = {};
  if (typeof req.query.supervisor === 'string') filter.supervisor = req.query.supervisor;
  if (typeof req.query.supervised === 'string') filter.supervised = req.query.supervised;
  const rows = await Supervision.find(filter)
    .sort({ updatedAt: -1 })
    .populate('supervisor', 'name email role')
    .populate('supervised', 'name email role')
    .lean();
  res.json({ supervisions: rows });
};

export const createSupervision = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const { supervisorId, supervisedId, type, title, startDate } = req.body as {
    supervisorId: string;
    supervisedId: string;
    type: (typeof SUPERVISION_TYPES)[number];
    title?: string;
    startDate?: string;
  };

  const [supervisor, supervised] = await Promise.all([
    User.findById(supervisorId).select('role isActive'),
    User.findById(supervisedId).select('role isActive'),
  ]);
  if (!supervisor || !supervised || !supervisor.isActive || !supervised.isActive) {
    res.status(404).json({ error: 'Encadrant ou encadré introuvable.' });
    return;
  }
  if (!isUserRole(supervisor.role) || roleRank(supervisor.role as UserRole) > roleRank('maitre_assistant')) {
    res.status(403).json({ error: 'Le rôle de l’encadrant doit être Maître-assistant ou supérieur.' });
    return;
  }
  if (!isStudentTrackRole(supervised.role)) {
    res.status(403).json({ error: 'La personne encadrée doit être Étudiant master ou Doctorant.' });
    return;
  }
  const expectedType = supervised.role === 'master_student' ? 'project' : 'thesis';
  if (type !== expectedType) {
    res.status(400).json({
      error:
        expectedType === 'project'
          ? 'Le type d’encadrement pour un Étudiant master doit être « project ».'
          : 'Le type d’encadrement pour un Doctorant doit être « thesis ».',
    });
    return;
  }

  const activeExisting = await Supervision.findOne({ supervised: supervisedId, status: 'active' })
    .select('_id')
    .lean();
  if (activeExisting) {
    res.status(409).json({ error: 'Cet utilisateur a déjà un encadrement actif.' });
    return;
  }

  const doc = await Supervision.create({
    supervisor: supervisorId,
    supervised: supervisedId,
    type,
    title: title ? String(title).trim() : '',
    startDate: startDate ? new Date(startDate) : new Date(),
    status: 'active',
  });

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'SUPERVISION_CREATED',
    targetModel: 'Supervision',
    targetId: doc._id.toString(),
    newValue: doc.toObject(),
    ip: ipFromReq(req),
  });
  res.status(201).json({ supervision: doc });
};

export const updateSupervision = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const doc = await Supervision.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Encadrement introuvable.' });
    return;
  }
  const before = doc.toObject();
  if (req.body.title != null) doc.title = String(req.body.title).trim();
  if (req.body.endDate != null) doc.endDate = new Date(req.body.endDate);
  if (typeof req.body.status === 'string' && SUPERVISION_STATUSES.includes(req.body.status)) {
    const current = doc.status;
    const next = req.body.status as (typeof SUPERVISION_STATUSES)[number];
    const allowed =
      current === next || (current === 'active' && (next === 'completed' || next === 'abandoned'));
    if (!allowed) {
      res.status(400).json({ error: 'Transition de statut invalide (active -> completed/abandoned).' });
      return;
    }
    doc.status = next;
  }
  await doc.save();
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'SUPERVISION_UPDATED',
    targetModel: 'Supervision',
    targetId: doc._id.toString(),
    oldValue: before,
    newValue: doc.toObject(),
    ip: ipFromReq(req),
  });
  res.json({ supervision: doc });
};

export const deleteSupervision = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const doc = await Supervision.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Encadrement introuvable.' });
    return;
  }
  await Supervision.deleteOne({ _id: doc._id });
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'SUPERVISION_DELETED',
    targetModel: 'Supervision',
    targetId: doc._id.toString(),
    oldValue: doc.toObject(),
    ip: ipFromReq(req),
  });
  res.json({ ok: true });
};

export const supervisionCreateValidators = [
  body('supervisorId').isMongoId(),
  body('supervisedId').isMongoId(),
  body('type').isIn([...SUPERVISION_TYPES]),
  body('title').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('startDate').optional().isISO8601(),
];

export const supervisionUpdateValidators = [
  param('id').isMongoId(),
  body('status').optional().isIn([...SUPERVISION_STATUSES]),
  body('title').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('endDate').optional().isISO8601(),
];

export const supervisionListValidators = [
  query('supervisor').optional().isMongoId(),
  query('supervised').optional().isMongoId(),
];
