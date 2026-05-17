import type { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Project from '../models/Project';
import Publication from '../models/Publication';
import User from '../models/User';
import ResearchTeam from '../models/ResearchTeam';
import { writeAuditLog } from '../utils/audit';
import { PROJECT_STATUSES, type ProjectStatus } from '../models/Project';
import {
  buildViewerContext,
  canViewPublication,
} from '../utils/publicationAccess';
import {
  canCreateOrLeadProject,
  canTransitionProjectStatus,
  isProjectCompletedLocked,
  isValidProjectStatus,
} from '../utils/projectStatus';

function normalizeIp(ip: string | string[] | undefined): string | undefined {
  if (ip === undefined) return undefined;
  return Array.isArray(ip) ? ip[0] : ip;
}

function ensureLeaderInMembers(
  leaderId: mongoose.Types.ObjectId,
  members: mongoose.Types.ObjectId[]
): mongoose.Types.ObjectId[] {
  const leaderStr = leaderId.toString();
  const set = new Set(members.map((m) => m.toString()));
  set.add(leaderStr);
  return [...set].map((id) => new mongoose.Types.ObjectId(id));
}

function parseMemberIds(raw: unknown, leaderId: string): mongoose.Types.ObjectId[] {
  const ids = Array.isArray(raw)
    ? (raw as string[]).filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];
  return ensureLeaderInMembers(
    new mongoose.Types.ObjectId(leaderId),
    ids.map((id) => new mongoose.Types.ObjectId(id))
  );
}

function canEditProject(
  auth: { userId: string; role: string },
  leaderId: string
): boolean {
  return auth.role === 'super_admin' || leaderId === auth.userId;
}

async function loadProjectOr404(id: string) {
  return Project.findById(id);
}

export const listProjects = async (req: Request, res: Response): Promise<void> => {
  const filter: Record<string, unknown> = {};
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const team = typeof req.query.team === 'string' ? req.query.team.trim() : '';
  if (status && isValidProjectStatus(status)) filter.status = status;
  if (team && mongoose.Types.ObjectId.isValid(team)) filter.team = team;

  const projects = await Project.find(filter)
    .sort({ updatedAt: -1 })
    .populate('leader', 'name email role')
    .populate('team', 'name axis')
    .populate('members', 'name email')
    .limit(200)
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

  if (!canCreateOrLeadProject(req.auth.role)) {
    res.status(403).json({ error: 'Seuls les Maître-assistant et grades supérieurs peuvent créer un projet.' });
    return;
  }

  const leaderId =
    req.auth.role === 'super_admin' && req.body.leader
      ? String(req.body.leader)
      : req.auth.userId;

  if (!mongoose.Types.ObjectId.isValid(leaderId)) {
    res.status(400).json({ error: 'Chef de projet invalide.' });
    return;
  }

  const leaderUser = await User.findById(leaderId).select('role isActive teamId').lean();
  if (!leaderUser || !leaderUser.isActive) {
    res.status(404).json({ error: 'Chef de projet introuvable.' });
    return;
  }
  if (!canCreateOrLeadProject(leaderUser.role)) {
    res.status(403).json({ error: 'Le chef de projet doit être Maître-assistant ou grade supérieur.' });
    return;
  }

  let teamId: mongoose.Types.ObjectId | null = null;
  if (req.body.team != null && mongoose.Types.ObjectId.isValid(String(req.body.team))) {
    const team = await ResearchTeam.findById(req.body.team).select('_id').lean();
    if (!team) {
      res.status(404).json({ error: 'Équipe introuvable.' });
      return;
    }
    teamId = team._id as mongoose.Types.ObjectId;
  } else if (leaderUser.teamId) {
    teamId = leaderUser.teamId as mongoose.Types.ObjectId;
  }

  const status: ProjectStatus =
    req.body.status != null && isValidProjectStatus(req.body.status) ? req.body.status : 'planned';
  if (status !== 'planned') {
    res.status(400).json({ error: 'Un nouveau projet doit commencer au statut « planifié ».' });
    return;
  }

  const members = parseMemberIds(req.body.members, leaderId);

  const doc = await Project.create({
    title: String(req.body.title).trim(),
    description: req.body.description != null ? String(req.body.description) : '',
    type: req.body.type != null ? String(req.body.type).trim() : '',
    leader: leaderId,
    members,
    team: teamId,
    status,
    startDate: req.body.startDate ? new Date(req.body.startDate) : null,
    endDate: req.body.endDate ? new Date(req.body.endDate) : null,
    fundingSource: req.body.fundingSource != null ? String(req.body.fundingSource).trim() : '',
    relatedPublications: [],
    createdBy: req.auth.userId,
  });

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_CREATED',
    targetModel: 'Project',
    targetId: doc._id.toString(),
    newValue: { title: doc.title, status: doc.status },
    ip: normalizeIp(req.ip),
  });

  res.status(201).json({ project: doc });
};

export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const doc = await Project.findById(req.params.id)
    .populate('leader', 'name email role')
    .populate('members', 'name email role')
    .populate('team', 'name axis')
    .populate('relatedPublications', 'title year journal')
    .lean();
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const leaderId = String(
    doc.leader && typeof doc.leader === 'object' && '_id' in doc.leader
      ? (doc.leader as { _id: unknown })._id
      : doc.leader
  );
  const canEdit = canEditProject(req.auth, leaderId);
  const canDelete = req.auth.role === 'super_admin' && doc.status === 'planned';
  const locked = isProjectCompletedLocked(doc.status as ProjectStatus);

  res.json({
    project: doc,
    canEdit,
    canDelete,
    locked,
    nextStatuses: locked
      ? []
      : (['planned', 'active', 'suspended', 'completed'] as ProjectStatus[]).filter(
          (s) => s !== doc.status && canTransitionProjectStatus(doc.status as ProjectStatus, s)
        ),
  });
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const doc = await loadProjectOr404(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const leaderId = doc.leader.toString();
  if (!canEditProject(req.auth, leaderId)) {
    res.status(403).json({ error: 'Seul le chef de projet ou le super administrateur peut modifier ce projet.' });
    return;
  }

  if (isProjectCompletedLocked(doc.status as ProjectStatus)) {
    res.status(409).json({ error: 'Un projet terminé ne peut plus être modifié.' });
    return;
  }

  const before = doc.toObject();

  if (req.body.title != null) doc.title = String(req.body.title).trim();
  if (req.body.description != null) doc.description = String(req.body.description);
  if (req.body.type != null) doc.type = String(req.body.type).trim();
  if (req.body.fundingSource != null) doc.fundingSource = String(req.body.fundingSource).trim();
  if (req.body.startDate !== undefined) {
    doc.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
  }
  if (req.body.endDate !== undefined) {
    doc.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
  }

  if (req.body.team !== undefined) {
    if (req.body.team == null || req.body.team === '') {
      doc.team = null;
    } else if (mongoose.Types.ObjectId.isValid(String(req.body.team))) {
      const team = await ResearchTeam.findById(req.body.team).select('_id').lean();
      if (!team) {
        res.status(404).json({ error: 'Équipe introuvable.' });
        return;
      }
      doc.team = team._id as mongoose.Types.ObjectId;
    }
  }

  if (req.body.status != null) {
    const next = String(req.body.status);
    if (!isValidProjectStatus(next)) {
      res.status(400).json({ error: 'Statut invalide.' });
      return;
    }
    if (!canTransitionProjectStatus(doc.status as ProjectStatus, next)) {
      res.status(400).json({
        error: 'Transition de statut non autorisée (pas de retour en arrière).',
      });
      return;
    }
    doc.status = next;
  }

  if (req.body.leader != null && req.auth.role === 'super_admin') {
    const newLeader = String(req.body.leader);
    if (!mongoose.Types.ObjectId.isValid(newLeader)) {
      res.status(400).json({ error: 'Chef de projet invalide.' });
      return;
    }
    const leaderUser = await User.findById(newLeader).select('role isActive').lean();
    if (!leaderUser || !leaderUser.isActive || !canCreateOrLeadProject(leaderUser.role)) {
      res.status(403).json({ error: 'Le chef de projet doit être Maître-assistant ou grade supérieur.' });
      return;
    }
    doc.leader = new mongoose.Types.ObjectId(newLeader);
    doc.members = ensureLeaderInMembers(doc.leader, doc.members);
  }

  await doc.save();

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_UPDATED',
    targetModel: 'Project',
    targetId: doc._id.toString(),
    oldValue: before,
    newValue: doc.toObject(),
    ip: normalizeIp(req.ip),
  });

  res.json({ project: doc });
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  if (req.auth.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const doc = await loadProjectOr404(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (doc.status !== 'planned') {
    res.status(409).json({ error: 'Seuls les projets au statut « planifié » peuvent être supprimés.' });
    return;
  }

  await doc.deleteOne();
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_DELETED',
    targetModel: 'Project',
    targetId: String(req.params.id),
    oldValue: { title: doc.title },
    ip: normalizeIp(req.ip),
  });

  res.status(204).end();
};

export const addProjectMember = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const doc = await loadProjectOr404(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!canEditProject(req.auth, doc.leader.toString())) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (isProjectCompletedLocked(doc.status as ProjectStatus)) {
    res.status(409).json({ error: 'Projet terminé : modification impossible.' });
    return;
  }

  const userId = String(req.body.userId);
  const user = await User.findById(userId).select('isActive role').lean();
  if (!user || !user.isActive || user.role === 'super_admin') {
    res.status(404).json({ error: 'Membre introuvable.' });
    return;
  }

  doc.members = ensureLeaderInMembers(doc.leader, [...doc.members, new mongoose.Types.ObjectId(userId)]);
  await doc.save();

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_MEMBER_ADDED',
    targetModel: 'Project',
    targetId: doc._id.toString(),
    newValue: { userId },
    ip: normalizeIp(req.ip),
  });

  res.json({ ok: true });
};

export const removeProjectMember = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const doc = await loadProjectOr404(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!canEditProject(req.auth, doc.leader.toString())) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (isProjectCompletedLocked(doc.status as ProjectStatus)) {
    res.status(409).json({ error: 'Projet terminé : modification impossible.' });
    return;
  }

  const userId = String(req.params.userId);
  if (userId === doc.leader.toString()) {
    res.status(400).json({ error: 'Impossible de retirer le chef de projet.' });
    return;
  }

  doc.members = doc.members.filter((m) => m.toString() !== userId);
  await doc.save();

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_MEMBER_REMOVED',
    targetModel: 'Project',
    targetId: doc._id.toString(),
    oldValue: { userId },
    ip: normalizeIp(req.ip),
  });

  res.json({ ok: true });
};

export const linkProjectPublication = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const doc = await loadProjectOr404(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!canEditProject(req.auth, doc.leader.toString())) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (isProjectCompletedLocked(doc.status as ProjectStatus)) {
    res.status(409).json({ error: 'Projet terminé : modification impossible.' });
    return;
  }

  const publicationId = String(req.body.publicationId);
  const pub = await Publication.findById(publicationId).lean();
  if (!pub) {
    res.status(404).json({ error: 'Publication introuvable.' });
    return;
  }

  const viewer = await buildViewerContext(req.auth.userId, req.auth.role);
  if (!canViewPublication(viewer, pub)) {
    res.status(403).json({ error: 'Vous n’avez pas accès à cette publication.' });
    return;
  }

  const ids = doc.relatedPublications.map((p) => p.toString());
  if (!ids.includes(publicationId)) {
    doc.relatedPublications.push(new mongoose.Types.ObjectId(publicationId));
    await doc.save();
  }

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_PUBLICATION_LINKED',
    targetModel: 'Project',
    targetId: doc._id.toString(),
    newValue: { publicationId },
    ip: normalizeIp(req.ip),
  });

  res.status(201).json({ ok: true });
};

export const unlinkProjectPublication = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const doc = await loadProjectOr404(String(req.params.id));
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!canEditProject(req.auth, doc.leader.toString())) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (isProjectCompletedLocked(doc.status as ProjectStatus)) {
    res.status(409).json({ error: 'Projet terminé : modification impossible.' });
    return;
  }

  const publicationId = String(req.params.publicationId);
  doc.relatedPublications = doc.relatedPublications.filter((p) => p.toString() !== publicationId);
  await doc.save();

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PROJECT_PUBLICATION_UNLINKED',
    targetModel: 'Project',
    targetId: doc._id.toString(),
    oldValue: { publicationId },
    ip: normalizeIp(req.ip),
  });

  res.json({ ok: true });
};

export const projectListValidators = [
  query('status').optional().isIn([...PROJECT_STATUSES]),
  query('team').optional().isMongoId(),
];

export const projectValidators = [
  body('title').isString().trim().isLength({ min: 1, max: 300 }),
  body('description').optional().isString(),
  body('type').optional().isString().trim().isLength({ max: 200 }),
  body('leader').optional().isMongoId(),
  body('members').optional().isArray(),
  body('team').optional({ values: 'null' }),
  body('status').optional().isIn([...PROJECT_STATUSES]),
  body('startDate').optional({ values: 'null' }).isISO8601(),
  body('endDate').optional({ values: 'null' }).isISO8601(),
  body('fundingSource').optional().isString().trim().isLength({ max: 300 }),
];

export const projectIdValidators = [param('id').isMongoId()];
export const projectMemberValidators = [param('id').isMongoId(), body('userId').isMongoId()];
export const projectMemberRemoveValidators = [param('id').isMongoId(), param('userId').isMongoId()];
export const projectPublicationValidators = [param('id').isMongoId(), body('publicationId').isMongoId()];
export const projectPublicationRemoveValidators = [param('id').isMongoId(), param('publicationId').isMongoId()];
