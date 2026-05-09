import type { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import User from '../models/User';
import ResearchTeam from '../models/ResearchTeam';
import Notification from '../models/Notification';
import { isUserRole, roleRank, type UserRole } from '../constants/roles';
import { writeAuditLog } from '../utils/audit';

function ipFromReq(req: Request): string | undefined {
  return Array.isArray(req.ip) ? req.ip[0] : req.ip;
}

function isLeaderEligible(role: string): boolean {
  return role !== 'super_admin' && isUserRole(role) && roleRank(role as UserRole) <= roleRank('maitre_assistant');
}

export const listTeams = async (_req: Request, res: Response): Promise<void> => {
  const teams = await ResearchTeam.find()
    .sort({ name: 1 })
    .populate('leader', 'name email role')
    .lean();
  const ids = teams.map((t) => t._id);
  const counts = await User.aggregate([
    { $match: { teamId: { $in: ids } } },
    { $group: { _id: '$teamId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), Number(c.count)]));
  res.json({
    teams: teams.map((t) => ({
      ...t,
      memberCount: countMap.get(String(t._id)) ?? 0,
    })),
  });
};

export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  const team = await ResearchTeam.findById(req.params.id).populate('leader', 'name email role').lean();
  if (!team) {
    res.status(404).json({ error: 'Équipe introuvable.' });
    return;
  }
  const members = await User.find({ teamId: team._id, isActive: true })
    .select('name email role currentGrade')
    .sort({ name: 1 })
    .lean();
  res.json({ team, members });
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const requestedLeaderId =
    req.auth.role === 'super_admin' ? String(req.body.leader ?? '').trim() : req.auth.userId;
  if (!requestedLeaderId) {
    res.status(400).json({ error: 'Leader obligatoire.' });
    return;
  }
  const leader = await User.findById(requestedLeaderId).select('role isActive');
  if (!leader || !leader.isActive) {
    res.status(404).json({ error: 'Leader introuvable.' });
    return;
  }
  if (!isLeaderEligible(leader.role)) {
    res.status(403).json({ error: 'Le leader doit être Maître-assistant ou supérieur.' });
    return;
  }
  const team = await ResearchTeam.create({
    name: String(req.body.name).trim(),
    axis: String(req.body.axis).trim(),
    description: req.body.description != null ? String(req.body.description) : '',
    leader: requestedLeaderId,
  });
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'TEAM_CREATED',
    targetModel: 'ResearchTeam',
    targetId: team._id.toString(),
    newValue: team.toObject(),
    ip: ipFromReq(req),
  });
  res.status(201).json({ team });
};

export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const team = await ResearchTeam.findById(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Équipe introuvable.' });
    return;
  }
  const before = team.toObject();
  if (req.body.name != null) team.name = String(req.body.name).trim();
  if (req.body.axis != null) team.axis = String(req.body.axis).trim();
  if (req.body.description != null) team.description = String(req.body.description);
  if (req.body.leader != null) {
    if (req.auth.role !== 'super_admin') {
      res.status(403).json({ error: 'Seul le super administrateur peut modifier le leader de l’équipe.' });
      return;
    }
    const leader = await User.findById(req.body.leader).select('role isActive');
    if (!leader || !leader.isActive) {
      res.status(404).json({ error: 'Leader introuvable.' });
      return;
    }
    if (!isLeaderEligible(leader.role)) {
      res.status(403).json({ error: 'Le leader doit être Maître-assistant ou supérieur.' });
      return;
    }
    team.leader = req.body.leader;
  }
  await team.save();
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'TEAM_UPDATED',
    targetModel: 'ResearchTeam',
    targetId: team._id.toString(),
    oldValue: before,
    newValue: team.toObject(),
    ip: ipFromReq(req),
  });
  res.json({ team });
};

export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const team = await ResearchTeam.findById(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Équipe introuvable.' });
    return;
  }
  const memberCount = await User.countDocuments({ teamId: team._id });
  if (memberCount > 0) {
    res.status(409).json({ error: 'Impossible de supprimer une équipe qui contient encore des membres.' });
    return;
  }
  await ResearchTeam.deleteOne({ _id: team._id });
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'TEAM_DELETED',
    targetModel: 'ResearchTeam',
    targetId: team._id.toString(),
    oldValue: team.toObject(),
    ip: ipFromReq(req),
  });
  res.json({ ok: true });
};

export const addTeamMember = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const team = await ResearchTeam.findById(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Équipe introuvable.' });
    return;
  }
  const user = await User.findById(req.body.userId);
  if (!user || !user.isActive) {
    res.status(404).json({ error: 'Membre introuvable.' });
    return;
  }
  if (user.role === 'super_admin') {
    res.status(403).json({ error: 'Le super administrateur ne peut pas être membre d’une équipe.' });
    return;
  }
  if (user.teamId && String(user.teamId) !== String(team._id)) {
    res.status(409).json({ error: 'Ce membre appartient déjà à une autre équipe.' });
    return;
  }
  const before = { teamId: user.teamId ?? null };
  user.teamId = team._id;
  await user.save();
  await Notification.create({
    userId: user._id,
    kind: 'team_member_added',
    title: 'Affectation à une équipe',
    body: `Vous avez été ajouté(e) à l’équipe « ${team.name} ».`,
    read: false,
  });
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'TEAM_MEMBER_ADDED',
    targetModel: 'User',
    targetId: user._id.toString(),
    oldValue: before,
    newValue: { teamId: team._id.toString() },
    ip: ipFromReq(req),
  });
  res.json({ ok: true });
};

export const removeTeamMember = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404).json({ error: 'Membre introuvable.' });
    return;
  }
  const before = { teamId: user.teamId ?? null };
  user.teamId = null;
  await user.save();
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'TEAM_MEMBER_REMOVED',
    targetModel: 'User',
    targetId: user._id.toString(),
    oldValue: before,
    newValue: { teamId: null },
    ip: ipFromReq(req),
  });
  res.json({ ok: true });
};

export const teamCreateValidators = [
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('axis').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString(),
  body('leader').optional().isMongoId(),
];

export const teamIdValidators = [param('id').isMongoId()];
export const teamUpdateValidators = [
  param('id').isMongoId(),
  body('name').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('axis').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString(),
  body('leader').optional().isMongoId(),
];

export const teamMemberValidators = [param('id').isMongoId(), body('userId').isMongoId()];
export const teamMemberRemoveValidators = [param('id').isMongoId(), param('userId').isMongoId()];
