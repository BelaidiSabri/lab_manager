import type { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import EncadrementRequest, { ENCADREMENT_REQUEST_STATUS } from '../models/EncadrementRequest';
import Supervision from '../models/Supervision';
import User from '../models/User';
import { DEPARTMENTS } from '../constants/departments';
import { isStudentTrackRole, isUserRole, roleRank, type UserRole } from '../constants/roles';
import { writeAuditLog } from '../utils/audit';

function ipFromReq(req: Request): string | undefined {
  return Array.isArray(req.ip) ? req.ip[0] : req.ip;
}

function isEligibleEncadreurRole(role: string): boolean {
  return (
    role !== 'super_admin' &&
    isUserRole(role) &&
    roleRank(role as UserRole) >= 0 &&
    roleRank(role as UserRole) <= roleRank('maitre_assistant')
  );
}

export const listDepartments = async (_req: Request, res: Response): Promise<void> => {
  res.json({ departments: DEPARTMENTS });
};

export const listEncadreurs = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  if (!isStudentTrackRole(req.auth.role)) {
    res.status(403).json({ error: 'Cette ressource est réservée aux étudiants Master et Doctorants.' });
    return;
  }
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';
  const base: Record<string, unknown> = {
    isActive: true,
    role: { $in: ['professor_emeritus', 'maitre_conference', 'maitre_assistant'] },
  };
  if (department) base.department = department;
  const users = await User.find(base).select('name role department speciality').sort({ name: 1 }).lean();
  const ids = users.map((u) => u._id);
  const activeCounts = await Supervision.aggregate([
    { $match: { supervisor: { $in: ids }, status: 'active' } },
    { $group: { _id: '$supervisor', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(activeCounts.map((r) => [String(r._id), Number(r.count)]));
  const pendingRows = await EncadrementRequest.find({
    student: req.auth.userId,
    status: 'pending',
    encadreur: { $in: ids },
  })
    .select('encadreur')
    .lean();
  const pendingSet = new Set(pendingRows.map((r) => String(r.encadreur)));
  const studentHasActiveSupervision =
    (await Supervision.exists({ supervised: req.auth.userId, status: 'active' })) != null;

  const encadreurs = users
    .map((u) => ({
      id: u._id.toString(),
      name: u.name,
      role: u.role,
      department: u.department,
      speciality: u.speciality,
      activeSupervisionCount: countMap.get(u._id.toString()) ?? 0,
      hasPendingRequestFromMe: pendingSet.has(u._id.toString()),
    }))
    .filter((u) =>
      q
        ? `${u.name} ${u.role} ${u.department ?? ''} ${u.speciality ?? ''}`.toLowerCase().includes(q)
        : true
    );

  res.json({ encadreurs, studentHasActiveSupervision, departments: DEPARTMENTS });
};

export const createEncadrementRequest = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  if (!isStudentTrackRole(req.auth.role)) {
    res.status(403).json({ error: 'Seuls les étudiants Master et Doctorants peuvent envoyer une demande.' });
    return;
  }
  const encadreurId = String(req.body.encadreurId);
  const message = String(req.body.message ?? '').trim();
  if (!message) {
    res.status(400).json({ error: 'Le message est obligatoire.' });
    return;
  }

  const encadreur = await User.findById(encadreurId).select('role isActive');
  if (!encadreur || !encadreur.isActive || !isEligibleEncadreurRole(encadreur.role)) {
    res.status(403).json({ error: 'Encadreur invalide ou non éligible.' });
    return;
  }
  if (await Supervision.exists({ supervised: req.auth.userId, status: 'active' })) {
    res.status(409).json({ error: 'Vous avez déjà un encadreur actif.' });
    return;
  }
  if (await EncadrementRequest.exists({ student: req.auth.userId, encadreur: encadreurId, status: 'pending' })) {
    res.status(409).json({ error: 'Vous avez déjà une demande en attente pour cet encadreur.' });
    return;
  }
  const activeForEncadreur = await Supervision.countDocuments({ supervisor: encadreurId, status: 'active' });
  if (activeForEncadreur >= 5) {
    res.status(409).json({ error: 'Cet encadreur a atteint la limite de 5 encadrements actifs.' });
    return;
  }
  const row = await EncadrementRequest.create({
    student: req.auth.userId,
    encadreur: encadreurId,
    message,
    status: 'pending',
  });
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'ENCADREMENT_REQUEST_CREATED',
    targetModel: 'EncadrementRequest',
    targetId: row._id.toString(),
    newValue: row.toObject(),
    ip: ipFromReq(req),
  });
  res.status(201).json({ request: row });
};

export const listEncadrementRequests = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const role = req.auth.role;
  if (role === 'super_admin') {
    // all
  } else if (isEligibleEncadreurRole(role)) {
    where.encadreur = req.auth.userId;
  } else if (isStudentTrackRole(role)) {
    where.student = req.auth.userId;
  } else {
    res.status(403).json({ error: 'Accès non autorisé à ces demandes.' });
    return;
  }
  const requests = await EncadrementRequest.find(where)
    .sort({ status: 1, createdAt: -1 })
    .populate('student', 'name role department speciality')
    .populate('encadreur', 'name role department speciality')
    .populate('createdSupervisionId', 'status type title startDate endDate')
    .lean();
  let activeSupervisionCount: number | undefined;
  if (isEligibleEncadreurRole(role)) {
    activeSupervisionCount = await Supervision.countDocuments({ supervisor: req.auth.userId, status: 'active' });
  }
  res.json({ requests, activeSupervisionCount });
};

export const updateEncadrementRequest = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const row = await EncadrementRequest.findById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Demande introuvable.' });
    return;
  }
  const isOwnerEncadreur = row.encadreur.toString() === req.auth.userId;
  if (!isOwnerEncadreur && req.auth.role !== 'super_admin') {
    res.status(403).json({ error: 'Seul l’encadreur ciblé ou le super administrateur peut traiter cette demande.' });
    return;
  }
  if (row.status !== 'pending') {
    res.status(400).json({ error: 'Seules les demandes en attente peuvent être traitées.' });
    return;
  }
  const nextStatus = String(req.body.status);
  if (nextStatus !== 'accepted' && nextStatus !== 'refused') {
    res.status(400).json({ error: 'Transition invalide: pending -> accepted|refused uniquement.' });
    return;
  }
  const before = row.toObject();

  if (nextStatus === 'accepted') {
    const activeForEncadreur = await Supervision.countDocuments({ supervisor: row.encadreur, status: 'active' });
    if (activeForEncadreur >= 5) {
      res.status(409).json({ error: 'Cet encadreur a atteint la limite de 5 encadrements actifs.' });
      return;
    }
    if (await Supervision.exists({ supervised: row.student, status: 'active' })) {
      res.status(409).json({ error: 'Cet étudiant a déjà un encadreur actif.' });
      return;
    }
    const student = await User.findById(row.student).select('role');
    if (!student || !isStudentTrackRole(student.role)) {
      res.status(400).json({ error: 'Le rôle de l’étudiant ne permet pas la création d’un encadrement.' });
      return;
    }
    const type = student.role === 'doctorant' ? 'thesis' : 'project';
    const supervision = await Supervision.create({
      supervisor: row.encadreur,
      supervised: row.student,
      type,
      status: 'active',
      startDate: new Date(),
      title: type === 'thesis' ? 'Encadrement de thèse' : 'Encadrement de projet',
    });
    row.status = 'accepted';
    row.createdSupervisionId = supervision._id;
    await row.save();
  } else {
    row.status = 'refused';
    if (req.body.refusalReason != null) {
      row.refusalReason = String(req.body.refusalReason).trim();
    }
    await row.save();
  }
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'ENCADREMENT_REQUEST_UPDATED',
    targetModel: 'EncadrementRequest',
    targetId: row._id.toString(),
    oldValue: before,
    newValue: row.toObject(),
    ip: ipFromReq(req),
  });
  res.json({ request: row });
};

export const deleteEncadrementRequest = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const row = await EncadrementRequest.findById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Demande introuvable.' });
    return;
  }
  const isAdmin = req.auth.role === 'super_admin';
  const isStudentOwner = row.student.toString() === req.auth.userId;
  if (!isAdmin && !(isStudentOwner && row.status === 'pending')) {
    res.status(403).json({ error: 'Suppression non autorisée.' });
    return;
  }
  const before = row.toObject();
  await EncadrementRequest.deleteOne({ _id: row._id });
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'ENCADREMENT_REQUEST_DELETED',
    targetModel: 'EncadrementRequest',
    targetId: row._id.toString(),
    oldValue: before,
    ip: ipFromReq(req),
  });
  res.json({ ok: true });
};

export const encadrementRequestCreateValidators = [
  body('encadreurId').isMongoId(),
  body('message').isString().trim().isLength({ min: 1, max: 1000 }),
];
export const encadrementRequestListValidators = [query('status').optional().isIn([...ENCADREMENT_REQUEST_STATUS])];
export const encadrementRequestUpdateValidators = [
  param('id').isMongoId(),
  body('status').isIn(['accepted', 'refused']),
  body('refusalReason').optional().isString().trim().isLength({ min: 1, max: 1000 }),
];
