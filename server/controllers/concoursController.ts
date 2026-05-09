import type { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import mongoose, { type ClientSession, type Types } from 'mongoose';
import Concours from '../models/Concours';
import ConcoursCandidature from '../models/ConcoursCandidature';
import User from '../models/User';
import GradeHistory from '../models/GradeHistory';
import Notification from '../models/Notification';
import { writeAuditLog } from '../utils/audit';
import { CONCOURS_STATUS } from '../models/Concours';

const concoursStatuses = CONCOURS_STATUS as readonly string[];
import { CANDIDATURE_STATUS } from '../models/ConcoursCandidature';
import {
  type AcademicGrade,
  type ConcoursTargetGrade,
  isAcademicGrade,
  isConcoursTargetGrade,
  isUserRole,
  ROLE_ORDER,
  roleRank,
  type UserRole,
} from '../constants/roles';
import {
  evaluateConcoursEligibility,
  isValidMaxJuniorForTarget,
} from '../utils/concoursEligibility';

function packUserEligibility(
  user: { role: string; currentGrade?: string | null } | null | undefined,
  row: {
    targetGrade: ConcoursTargetGrade;
    maxJuniorEligibleGrade?: AcademicGrade | null;
  }
): { canApply: boolean; code: string; message: string } | null {
  if (!user) return null;
  const d = evaluateConcoursEligibility(
    user.role,
    user.currentGrade,
    row.targetGrade,
    row.maxJuniorEligibleGrade ?? undefined
  );
  return {
    canApply: d.code === 'ok',
    code: d.code,
    message: d.message,
  };
}

export const listConcours = async (req: Request, res: Response): Promise<void> => {
  const rows = await Concours.find().sort({ endDate: -1 }).populate('createdBy', 'name email').lean();
  let viewer: { role: string; currentGrade?: string | null } | null = null;
  if (req.auth) {
    const u = await User.findById(req.auth.userId).select('role currentGrade').lean();
    viewer = u ?? null;
  }
  const concours = rows.map((row) => ({
    ...row,
    userEligibility: packUserEligibility(viewer, {
      targetGrade: row.targetGrade as ConcoursTargetGrade,
      maxJuniorEligibleGrade: row.maxJuniorEligibleGrade as AcademicGrade | undefined,
    }),
  }));
  res.json({ concours });
};

/** Authenticated user’s candidatures (all concours), for status + notifications UX. */
export const listMyCandidatures = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const rows = await ConcoursCandidature.find({ userId: req.auth.userId })
    .populate('concoursId', 'title targetGrade status startDate endDate')
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ candidatures: rows });
};

export const createConcours = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const actorUserId = req.auth.userId;
  const title = String(req.body.title).trim();
  const description = req.body.description != null ? String(req.body.description) : '';
  const department = String(req.body.department ?? '').trim();
  const targetGrade = String(req.body.targetGrade);
  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);
  const status =
    typeof req.body.status === 'string' && concoursStatuses.includes(req.body.status)
      ? req.body.status
      : 'open';

  if (!isConcoursTargetGrade(targetGrade)) {
    res
      .status(400)
      .json({ error: 'Grade cible invalide (doit être un grade de carrière, pas Master/Doctorat).' });
    return;
  }
  if (!department) {
    res.status(400).json({ error: 'Le département est obligatoire.' });
    return;
  }
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    res.status(400).json({ error: 'Dates invalides.' });
    return;
  }

  let maxJuniorEligibleGrade: AcademicGrade | undefined;
  if (req.body.maxJuniorEligibleGrade != null && String(req.body.maxJuniorEligibleGrade).trim() !== '') {
    const mj = String(req.body.maxJuniorEligibleGrade).trim();
    if (!isAcademicGrade(mj)) {
      res.status(400).json({ error: 'maxJuniorEligibleGrade invalide.' });
      return;
    }
    if (!isValidMaxJuniorForTarget(targetGrade, mj)) {
      res.status(400).json({
        error:
          'maxJuniorEligibleGrade doit être plus junior que le grade visé (grade le plus bas encore autorisé à postuler).',
      });
      return;
    }
    maxJuniorEligibleGrade = mj;
  }

  if (status === 'open' || status === 'closed') {
    const conflictingConcours = await Concours.findOne({
      targetGrade,
      department,
      status: { $in: ['open', 'closed'] },
    })
      .select('_id title status')
      .lean();
    if (conflictingConcours) {
      res.status(409).json({
        error:
          'Un concours de ce grade est déjà actif pour ce département. Un seul concours ouvert/fermé par couple grade-département est autorisé.',
      });
      return;
    }
  }

  const doc = await Concours.create({
    title,
    description,
    department,
    targetGrade,
    maxJuniorEligibleGrade,
    startDate,
    endDate,
    status,
    createdBy: req.auth.userId,
  });

  await writeAuditLog({
    userId: actorUserId,
    action: 'CONCOURS_CREATED',
    targetModel: 'Concours',
    targetId: doc._id.toString(),
    newValue: { title, targetGrade, department },
    ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
  });

  res.status(201).json({ concours: doc });
};

export const getConcoursById = async (req: Request, res: Response): Promise<void> => {
  const row = await Concours.findById(req.params.id).populate('createdBy', 'name email').lean();
  if (!row) {
    res.status(404).json({ error: 'Concours introuvable.' });
    return;
  }
  let viewer: { role: string; currentGrade?: string | null } | null = null;
  if (req.auth) {
    const u = await User.findById(req.auth.userId).select('role currentGrade').lean();
    viewer = u ?? null;
  }
  const userEligibility = packUserEligibility(viewer, {
    targetGrade: row.targetGrade as ConcoursTargetGrade,
    maxJuniorEligibleGrade: row.maxJuniorEligibleGrade as AcademicGrade | undefined,
  });
  res.json({ concours: row, userEligibility });
};

export const updateConcours = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const actorUserId = req.auth.userId;
  const doc = await Concours.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Concours introuvable.' });
    return;
  }

  const before = doc.toObject();
  if (req.body.title != null) doc.title = String(req.body.title).trim();
  if (req.body.description != null) doc.description = String(req.body.description);
  if (req.body.department != null) {
    const dep = String(req.body.department).trim();
    if (!dep) {
      res.status(400).json({ error: 'Le département est obligatoire.' });
      return;
    }
    doc.department = dep;
  }
  if (req.body.targetGrade != null) {
    const tg = String(req.body.targetGrade);
    if (!isConcoursTargetGrade(tg)) {
      res.status(400).json({ error: 'Grade cible invalide.' });
      return;
    }
    doc.targetGrade = tg as ConcoursTargetGrade;
  }
  if (req.body.startDate != null) doc.startDate = new Date(req.body.startDate);
  if (req.body.endDate != null) doc.endDate = new Date(req.body.endDate);
  const requestedStatus =
    typeof req.body.status === 'string' && concoursStatuses.includes(req.body.status)
      ? (req.body.status as (typeof CONCOURS_STATUS)[number])
      : null;
  const previousStatus = doc.status;
  if (requestedStatus && requestedStatus !== previousStatus) {
    const validTransition =
      (previousStatus === 'open' && requestedStatus === 'closed') ||
      (previousStatus === 'closed' && requestedStatus === 'finished');
    if (!validTransition) {
      res.status(400).json({
        error: 'Transition de statut invalide. Transitions autorisées: Ouvert -> Fermé, Fermé -> Terminé.',
      });
      return;
    }
    doc.status = requestedStatus;
  }

  const nextTarget = (doc.targetGrade as string) as ConcoursTargetGrade;
  if (req.body.maxJuniorEligibleGrade !== undefined) {
    const raw = req.body.maxJuniorEligibleGrade;
    if (raw === null || raw === '') {
      doc.set('maxJuniorEligibleGrade', undefined);
    } else if (typeof raw === 'string') {
      const mj = raw.trim();
      if (!isAcademicGrade(mj)) {
        res.status(400).json({ error: 'maxJuniorEligibleGrade invalide.' });
        return;
      }
      if (!isValidMaxJuniorForTarget(nextTarget, mj)) {
        res.status(400).json({
          error:
            'maxJuniorEligibleGrade doit être plus junior que le grade visé (grade le plus bas encore autorisé à postuler).',
        });
        return;
      }
      doc.maxJuniorEligibleGrade = mj;
    }
  }

  const mjFinal = doc.maxJuniorEligibleGrade as AcademicGrade | undefined;
  if (mjFinal && !isValidMaxJuniorForTarget(doc.targetGrade as ConcoursTargetGrade, mjFinal)) {
    res.status(400).json({ error: 'Combinaison grade visé / plafond junior invalide après mise à jour.' });
    return;
  }

  if (doc.status === 'open' || doc.status === 'closed') {
    const conflictingConcours = await Concours.findOne({
      _id: { $ne: doc._id },
      targetGrade: doc.targetGrade,
      department: doc.department,
      status: { $in: ['open', 'closed'] },
    })
      .select('_id')
      .lean();
    if (conflictingConcours) {
      res.status(409).json({
        error:
          'Un concours de ce grade est déjà actif pour ce département. Un seul concours ouvert/fermé par couple grade-département est autorisé.',
      });
      return;
    }
  }

  await doc.save();

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'CONCOURS_UPDATED',
    targetModel: 'Concours',
    targetId: doc._id.toString(),
    oldValue: before,
    newValue: doc.toObject(),
    ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
  });

  if (previousStatus === 'closed' && doc.status === 'finished') {
    const pendingRows = await ConcoursCandidature.find({
      concoursId: doc._id,
      status: 'pending',
    }).select('_id status');

    if (pendingRows.length > 0) {
      await ConcoursCandidature.updateMany(
        { concoursId: doc._id, status: 'pending' },
        { $set: { status: 'rejected' } }
      );

      await Promise.all(
        pendingRows.map((row) =>
          writeAuditLog({
            userId: actorUserId,
            action: 'AUTO_REJECT_ON_FINISH',
            targetModel: 'ConcoursCandidature',
            targetId: row._id.toString(),
            oldValue: { status: row.status },
            newValue: { status: 'rejected', concoursId: doc._id.toString() },
            ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
          })
        )
      );
    }
  }

  res.json({ concours: doc });
};

export const applyConcours = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const actorUserId = req.auth.userId;
  const concours = await Concours.findById(req.params.id);
  if (!concours) {
    res.status(404).json({ error: 'Concours introuvable.' });
    return;
  }
  const applicant = await User.findById(req.auth.userId);
  if (!applicant) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }

  if (concours.status === 'closed' || concours.status === 'finished') {
    res.status(400).json({ error: 'Le concours est fermé et ne peut plus recevoir de candidatures.' });
    return;
  }
  if (concours.status !== 'open') {
    res.status(400).json({ error: 'Le concours n’est pas ouvert aux candidatures.' });
    return;
  }

  const now = new Date();
  if (now < concours.startDate || now > concours.endDate) {
    res.status(400).json({ error: 'Le concours n’est pas dans sa période de candidature.' });
    return;
  }

  const target = concours.targetGrade as UserRole;
  const targetIdx = ROLE_ORDER.indexOf(target);
  const applicantIdx = ROLE_ORDER.indexOf(req.auth.role as UserRole);
  if (req.auth.role === 'doctorant' || req.auth.role === 'master_student') {
    res.status(403).json({
      error:
        'Les profils Doctorant et Étudiant master ne candidatent pas aux concours. Utilisez la promotion administrative dédiée.',
    });
    return;
  }
  if (targetIdx < 0 || applicantIdx < 0 || applicantIdx !== targetIdx + 1) {
    const lowerRole = ROLE_ORDER[targetIdx + 1];
    res.status(403).json({
      error: lowerRole
        ? `Seuls les utilisateurs ayant le grade immédiatement inférieur (${lowerRole}) peuvent candidater à ce concours.`
        : 'Ce concours ne permet pas de candidature pour votre grade.',
    });
    return;
  }

  const existing = await ConcoursCandidature.findOne({
    concoursId: concours._id,
    userId: req.auth.userId,
  })
    .select('_id')
    .lean();
  if (existing) {
    res.status(409).json({ error: 'Vous avez déjà une candidature pour ce concours.' });
    return;
  }

  const docsPayload = Array.isArray(req.body.documents)
    ? (req.body.documents as { name?: string; fileUrl: string }[])
    : [];

  try {
    const cand = await ConcoursCandidature.create({
      concoursId: concours._id,
      userId: req.auth.userId,
      status: 'pending',
      documents: docsPayload.map((d) => ({
        name: d.name?.trim(),
        fileUrl: String(d.fileUrl).trim(),
      })),
    });

    await writeAuditLog({
      userId: req.auth.userId,
      action: 'CONCOURS_APPLIED',
      targetModel: 'ConcoursCandidature',
      targetId: cand._id.toString(),
      newValue: { concoursId: concours._id.toString() },
      ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
    });

    res.status(201).json({ candidature: cand });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'Vous avez déjà postulé à ce concours.' });
      return;
    }
    throw e;
  }
};

export const listCandidatures = async (req: Request, res: Response): Promise<void> => {
  const rows = await ConcoursCandidature.find({ concoursId: req.params.id })
    .populate('userId', 'name email role currentGrade academicProgram')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ candidatures: rows });
};

async function notifyCandidatureOutcome(
  userId: Types.ObjectId,
  concoursId: Types.ObjectId,
  candidatureId: Types.ObjectId,
  concoursTitle: string,
  admitted: boolean
): Promise<void> {
  await Notification.create({
    userId,
    kind: admitted ? 'concours_admitted' : 'concours_rejected',
    title: admitted ? 'Candidature acceptée' : 'Candidature non retenue',
    body: admitted
      ? `Votre candidature au concours « ${concoursTitle} » a été acceptée. Votre grade de carrière a été mis à jour.`
      : `Votre candidature au concours « ${concoursTitle} » n’a pas été retenue.`,
    read: false,
    concoursId,
    candidatureId,
  });
}

export const updateCandidature = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const actorUserId = req.auth.userId;

  const concours = await Concours.findById(req.params.id);
  if (!concours) {
    res.status(404).json({ error: 'Concours introuvable.' });
    return;
  }

  const cand = await ConcoursCandidature.findOne({
    _id: req.params.cid,
    concoursId: req.params.id,
  });
  if (!cand) {
    res.status(404).json({ error: 'Candidature introuvable.' });
    return;
  }

  const status = String(req.body.status);
  if (!CANDIDATURE_STATUS.includes(status as (typeof CANDIDATURE_STATUS)[number])) {
    res.status(400).json({ error: 'Statut invalide.' });
    return;
  }

  const score =
    req.body.score !== undefined && req.body.score !== null ? Number(req.body.score) : undefined;

  const user = await User.findById(cand.userId);
  if (!user) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }

  const oldCand = cand.toObject();
  const concoursTitle = concours.title;

  if (status === 'admitted') {
    const tg = String(concours.targetGrade);
    const refreshed = await User.findById(cand.userId);
    if (!refreshed) {
      res.status(404).json({ error: 'Utilisateur introuvable pour la promotion.' });
      return;
    }
    const oldGrade = refreshed.currentGrade ? String(refreshed.currentGrade) : '';
    const currentRank = oldGrade && isUserRole(oldGrade) ? roleRank(oldGrade) : -1;
    const targetRank = isUserRole(tg) ? roleRank(tg) : -1;
    const alreadyAtOrAboveTarget =
      currentRank >= 0 && targetRank >= 0 && currentRank <= targetRank;

    if (alreadyAtOrAboveTarget) {
      console.warn(
        `[concours] Promotion ignorée pour user=${refreshed._id.toString()} concours=${concours._id.toString()}: grade actuel (${oldGrade}) déjà >= grade cible (${tg}).`
      );
    } else {
      const applyGradeBump = async (session?: ClientSession): Promise<void> => {
        refreshed.currentGrade = tg as AcademicGrade;
        if (isUserRole(tg) && tg !== 'super_admin') {
          refreshed.role = tg as UserRole;
        }
        if (refreshed.role !== 'master_student' && refreshed.role !== 'doctorant') {
          refreshed.set('academicProgram', 'none');
        }
        await refreshed.save(session ? { session } : undefined);

        await GradeHistory.create(
          [
            {
              userId: refreshed._id,
              oldGrade: oldGrade || '(none)',
              newGrade: tg,
              concoursId: concours._id,
              reason: 'concours',
              changedBy: actorUserId,
              changedAt: new Date(),
            },
          ],
          session ? { session } : undefined
        );

        await writeAuditLog({
          userId: actorUserId,
          action: 'GRADE_UPDATED_FROM_CONCOURS',
          targetModel: 'User',
          targetId: refreshed._id.toString(),
          oldValue: { currentGrade: oldGrade || null, role: user.role },
          newValue: { currentGrade: tg, role: refreshed.role },
          ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
        });
      };

      let usedTransaction = false;
      let session: ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
        const supportsTransactions = Boolean(hello?.setName || hello?.msg === 'isdbgrid');
        if (supportsTransactions) {
          usedTransaction = true;
          await session.withTransaction(async () => {
            await applyGradeBump(session as ClientSession);
          });
        }
      } catch (transactionError) {
        console.warn('[concours] Echec transaction promotion, fallback séquentiel.', transactionError);
      } finally {
        if (session) {
          await session.endSession();
        }
      }

      if (!usedTransaction) {
        try {
          await applyGradeBump();
        } catch (sequentialError) {
          console.error('[concours] Echec partiel possible pendant promotion séquentielle.', sequentialError);
          throw sequentialError;
        }
      }
    }
  }

  cand.status = status as 'pending' | 'admitted' | 'rejected';
  if (score !== undefined && Number.isFinite(score)) cand.score = score;
  await cand.save();

  if (status === 'admitted' || status === 'rejected') {
    await notifyCandidatureOutcome(
      cand.userId,
      concours._id,
      cand._id,
      concoursTitle,
      status === 'admitted'
    );
  }

  await writeAuditLog({
    userId: actorUserId,
    action: 'CONCOURS_CANDIDATURE_UPDATED',
    targetModel: 'ConcoursCandidature',
    targetId: cand._id.toString(),
    oldValue: oldCand,
    newValue: cand.toObject(),
    ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
  });

  res.json({ candidature: cand, user: { id: user._id.toString(), currentGrade: user.currentGrade, role: user.role } });
};

export const concoursCreateValidators = [
  body('title').isString().trim().isLength({ min: 1, max: 300 }),
  body('description').optional().isString(),
  body('department').isString().trim().isLength({ min: 1, max: 120 }),
  body('targetGrade').isString().trim(),
  body('maxJuniorEligibleGrade').optional().isString().trim(),
  body('startDate').isString().trim(),
  body('endDate').isString().trim(),
  body('status').optional().isIn([...CONCOURS_STATUS]),
];

export const concoursUpdateValidators = [
  body('title').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('description').optional().isString(),
  body('department').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('targetGrade').optional().isString().trim(),
  body('maxJuniorEligibleGrade').optional({ nullable: true }).isString(),
  body('startDate').optional().isString().trim(),
  body('endDate').optional().isString().trim(),
  body('status').optional().isIn([...CONCOURS_STATUS]),
];

export const candidatureUpdateValidators = [
  param('id').isMongoId(),
  param('cid').isMongoId(),
  body('status').isIn([...CANDIDATURE_STATUS]),
  body('score').optional().isFloat(),
];
