import type { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import ResearchTeam from '../models/ResearchTeam';
import Project from '../models/Project';
import TeamCollaboration, { normalizeTeamPair } from '../models/TeamCollaboration';
import Notification from '../models/Notification';
import { writeAuditLog } from '../utils/audit';
import {
  findCollaborationProjects,
  linkProjectToCollaboration,
  unlinkProjectFromCollaboration,
} from '../utils/projectCollaborationLink';
import { canCreateOrLeadProject } from '../utils/projectStatus';
import { validateProjectTeamIds } from '../utils/projectTeams';

function parseOptionalDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function validateDateSpan(startDate: Date | null, endDate: Date | null): string | null {
  if (startDate && endDate && endDate < startDate) {
    return 'La date de fin doit être postérieure ou égale à la date de début.';
  }
  return null;
}

function ipFromReq(req: Request): string | undefined {
  return Array.isArray(req.ip) ? req.ip[0] : req.ip;
}

function partnerTeamId(collab: { teamA: { _id?: unknown } | unknown; teamB: { _id?: unknown } | unknown }, teamId: string) {
  const a = String((collab.teamA as { _id?: unknown })?._id ?? collab.teamA);
  const b = String((collab.teamB as { _id?: unknown })?._id ?? collab.teamB);
  return a === teamId ? b : a;
}

export const listTeamCollaborations = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  const teamId = String(req.params.id);
  const team = await ResearchTeam.findById(teamId).select('_id').lean();
  if (!team) {
    res.status(404).json({ error: 'Équipe introuvable.' });
    return;
  }
  const collabs = await TeamCollaboration.find({
    $or: [{ teamA: teamId }, { teamB: teamId }],
  })
    .sort({ updatedAt: -1 })
    .populate({ path: 'teamA', select: 'name axis leader', populate: { path: 'leader', select: '_id name' } })
    .populate({ path: 'teamB', select: 'name axis leader', populate: { path: 'leader', select: '_id name' } })
    .populate('createdBy', 'name')
    .lean();

  const collaborations = await Promise.all(
    collabs.map(async (c) => {
      const partnerId = partnerTeamId(c, teamId);
      const partner = String(c.teamA._id ?? c.teamA) === partnerId ? c.teamA : c.teamB;
      const projects = await findCollaborationProjects(c._id);
      return {
        _id: c._id,
        partnerTeam: partner,
        note: c.note,
        startDate: c.startDate,
        endDate: c.endDate,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        projects: projects.map((p) => ({
          _id: p._id,
          title: p.title,
          status: p.status,
          leader: p.leader,
          teams: p.teams,
        })),
      };
    })
  );

  res.json({ collaborations });
};

export const addTeamCollaboration = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const teamId = String(req.params.id);
  const partnerTeamIdRaw = String(req.body.partnerTeamId).trim();
  if (teamId === partnerTeamIdRaw) {
    res.status(400).json({ error: 'Une équipe ne peut pas collaborer avec elle-même.' });
    return;
  }

  const [team, partnerTeam] = await Promise.all([
    ResearchTeam.findById(teamId).populate('leader', '_id name'),
    ResearchTeam.findById(partnerTeamIdRaw).populate('leader', '_id name'),
  ]);
  if (!team || !partnerTeam) {
    res.status(404).json({ error: 'Équipe introuvable.' });
    return;
  }

  const [teamA, teamB] = normalizeTeamPair(teamId, partnerTeamIdRaw);
  const existing = await TeamCollaboration.findOne({ teamA, teamB }).lean();
  if (existing) {
    res.status(409).json({ error: 'Cette collaboration existe déjà.' });
    return;
  }

  const note = req.body.note != null ? String(req.body.note).trim() : '';
  const startDate = parseOptionalDate(req.body.startDate);
  const endDate = parseOptionalDate(req.body.endDate);
  const dateError = validateDateSpan(startDate, endDate);
  if (dateError) {
    res.status(400).json({ error: dateError });
    return;
  }

  const collab = await TeamCollaboration.create({
    teamA,
    teamB,
    note,
    startDate,
    endDate,
    createdBy: req.auth.userId,
  });

  const partnerLeaderId =
    partnerTeam.leader && typeof partnerTeam.leader === 'object' && '_id' in partnerTeam.leader
      ? String((partnerTeam.leader as { _id: unknown })._id)
      : partnerTeam.leader
        ? String(partnerTeam.leader)
        : null;
  if (partnerLeaderId) {
    await Notification.create({
      userId: partnerLeaderId,
      kind: 'team_collaboration_added',
      title: 'Nouvelle collaboration inter-équipes',
      body: `L’équipe « ${team.name} » a établi une collaboration avec votre équipe « ${partnerTeam.name} ».`,
      read: false,
    });
  }

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'TEAM_COLLABORATION_ADDED',
    targetModel: 'TeamCollaboration',
    targetId: collab._id.toString(),
    newValue: {
      teamA: teamA.toString(),
      teamB: teamB.toString(),
      note,
      startDate,
      endDate,
    },
    ip: ipFromReq(req),
  });

  let linkedProjectId: string | null = null;
  if (req.body.projectId && mongoose.Types.ObjectId.isValid(String(req.body.projectId))) {
    const linkResult = await linkProjectToCollaboration(collab._id, String(req.body.projectId));
    if (!linkResult.ok) {
      res.status(linkResult.status).json({ error: linkResult.error });
      return;
    }
    linkedProjectId = String(req.body.projectId);
  } else if (req.body.projectTitle && String(req.body.projectTitle).trim()) {
    if (!canCreateOrLeadProject(req.auth.role)) {
      res.status(403).json({ error: 'Seuls les Maître-assistant et grades supérieurs peuvent créer un projet.' });
      return;
    }
    const validation = await validateProjectTeamIds([teamId, partnerTeamIdRaw]);
    if (!validation.ok) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }
    const project = await Project.create({
      title: String(req.body.projectTitle).trim(),
      description: req.body.projectDescription != null ? String(req.body.projectDescription) : '',
      type: req.body.projectType != null ? String(req.body.projectType).trim() : '',
      leader: req.auth.userId,
      members: [new mongoose.Types.ObjectId(req.auth.userId)],
      teams: validation.objectIds,
      collaboration: collab._id,
      status: 'planned',
      createdBy: req.auth.userId,
    });
    await TeamCollaboration.updateOne({ _id: collab._id }, { $addToSet: { projects: project._id } });
    linkedProjectId = project._id.toString();
  }

  res.status(201).json({ ok: true, collaborationId: collab._id.toString(), projectId: linkedProjectId });
};

async function loadCollaborationByPair(teamId: string, partnerId: string) {
  const [teamA, teamB] = normalizeTeamPair(teamId, partnerId);
  return TeamCollaboration.findOne({ teamA, teamB });
}

export const attachCollaborationProject = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const teamId = String(req.params.id);
  const partnerId = String(req.params.partnerId);
  const collab = await loadCollaborationByPair(teamId, partnerId);
  if (!collab) {
    res.status(404).json({ error: 'Collaboration introuvable.' });
    return;
  }

  if (req.body.projectId && mongoose.Types.ObjectId.isValid(String(req.body.projectId))) {
    const linkResult = await linkProjectToCollaboration(collab._id, String(req.body.projectId));
    if (!linkResult.ok) {
      res.status(linkResult.status).json({ error: linkResult.error });
      return;
    }
    res.status(201).json({ projectId: String(req.body.projectId) });
    return;
  }

  if (req.body.title && String(req.body.title).trim()) {
    if (!canCreateOrLeadProject(req.auth.role)) {
      res.status(403).json({ error: 'Seuls les Maître-assistant et grades supérieurs peuvent créer un projet.' });
      return;
    }
    const validation = await validateProjectTeamIds([teamId, partnerId]);
    if (!validation.ok) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }
    const project = await Project.create({
      title: String(req.body.title).trim(),
      description: req.body.description != null ? String(req.body.description) : '',
      type: req.body.type != null ? String(req.body.type).trim() : '',
      leader: req.auth.userId,
      members: [new mongoose.Types.ObjectId(req.auth.userId)],
      teams: validation.objectIds,
      collaboration: collab._id,
      status: 'planned',
      createdBy: req.auth.userId,
    });
    await TeamCollaboration.updateOne({ _id: collab._id }, { $addToSet: { projects: project._id } });
    res.status(201).json({ project });
    return;
  }

  res.status(400).json({ error: 'Indiquez projectId ou title pour rattacher un projet.' });
};

export const detachCollaborationProject = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const teamId = String(req.params.id);
  const partnerId = String(req.params.partnerId);
  const projectId = String(req.params.projectId);
  const collab = await loadCollaborationByPair(teamId, partnerId);
  if (!collab) {
    res.status(404).json({ error: 'Collaboration introuvable.' });
    return;
  }

  await unlinkProjectFromCollaboration(collab._id, projectId);
  res.json({ ok: true });
};

export const updateTeamCollaboration = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const teamId = String(req.params.id);
  const partnerId = String(req.params.partnerId);
  const [teamA, teamB] = normalizeTeamPair(teamId, partnerId);
  const collab = await TeamCollaboration.findOne({ teamA, teamB });
  if (!collab) {
    res.status(404).json({ error: 'Collaboration introuvable.' });
    return;
  }

  const before = collab.toObject();
  if (req.body.note !== undefined) collab.note = String(req.body.note).trim();
  if (req.body.startDate !== undefined) collab.startDate = parseOptionalDate(req.body.startDate);
  if (req.body.endDate !== undefined) collab.endDate = parseOptionalDate(req.body.endDate);

  const start = collab.startDate ?? null;
  const end = collab.endDate ?? null;
  const dateError = validateDateSpan(start, end);
  if (dateError) {
    res.status(400).json({ error: dateError });
    return;
  }

  await collab.save();
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'TEAM_COLLABORATION_UPDATED',
    targetModel: 'TeamCollaboration',
    targetId: collab._id.toString(),
    oldValue: before,
    newValue: collab.toObject(),
    ip: ipFromReq(req),
  });

  res.json({ collaboration: collab });
};

export const removeTeamCollaboration = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const teamId = String(req.params.id);
  const partnerId = String(req.params.partnerId);
  const team = await ResearchTeam.findById(teamId).select('_id name').lean();
  if (!team) {
    res.status(404).json({ error: 'Équipe introuvable.' });
    return;
  }

  const [teamA, teamB] = normalizeTeamPair(teamId, partnerId);
  const collab = await TeamCollaboration.findOneAndDelete({ teamA, teamB });
  if (!collab) {
    res.status(404).json({ error: 'Collaboration introuvable.' });
    return;
  }

  await Project.updateMany({ collaboration: collab._id }, { $unset: { collaboration: 1 } });

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'TEAM_COLLABORATION_REMOVED',
    targetModel: 'TeamCollaboration',
    targetId: collab._id.toString(),
    oldValue: { teamA: teamA.toString(), teamB: teamB.toString() },
    ip: ipFromReq(req),
  });

  res.json({ ok: true });
};

export const teamCollaborationListValidators = [param('id').isMongoId()];
export const teamCollaborationAddValidators = [
  param('id').isMongoId(),
  body('partnerTeamId').isMongoId(),
  body('note').optional().isString().trim().isLength({ max: 500 }),
  body('startDate').optional().isISO8601().toDate(),
  body('endDate').optional().isISO8601().toDate(),
  body('projectId').optional().isMongoId(),
  body('projectTitle').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('projectDescription').optional().isString(),
  body('projectType').optional().isString().trim().isLength({ max: 200 }),
];
export const collaborationProjectValidators = [
  param('id').isMongoId(),
  param('partnerId').isMongoId(),
  body('projectId').optional().isMongoId(),
  body('title').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('description').optional().isString(),
  body('type').optional().isString().trim().isLength({ max: 200 }),
];
export const collaborationProjectRemoveValidators = [
  param('id').isMongoId(),
  param('partnerId').isMongoId(),
  param('projectId').isMongoId(),
];
export const teamCollaborationUpdateValidators = [
  param('id').isMongoId(),
  param('partnerId').isMongoId(),
  body('note').optional().isString().trim().isLength({ max: 500 }),
];
export const teamCollaborationRemoveValidators = [param('id').isMongoId(), param('partnerId').isMongoId()];
