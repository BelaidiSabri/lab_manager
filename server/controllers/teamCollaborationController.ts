import type { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import ResearchTeam from '../models/ResearchTeam';
import TeamCollaboration, { normalizeTeamPair } from '../models/TeamCollaboration';
import Notification from '../models/Notification';
import { writeAuditLog } from '../utils/audit';

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

  res.json({
    collaborations: collabs.map((c) => {
      const partnerId = partnerTeamId(c, teamId);
      const partner = String(c.teamA._id ?? c.teamA) === partnerId ? c.teamA : c.teamB;
      return {
        _id: c._id,
        partnerTeam: partner,
        note: c.note,
        startDate: c.startDate,
        endDate: c.endDate,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    }),
  });
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

  res.status(201).json({ ok: true });
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
];
export const teamCollaborationUpdateValidators = [
  param('id').isMongoId(),
  param('partnerId').isMongoId(),
  body('note').optional().isString().trim().isLength({ max: 500 }),
];
export const teamCollaborationRemoveValidators = [param('id').isMongoId(), param('partnerId').isMongoId()];
