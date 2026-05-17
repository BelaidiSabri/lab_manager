import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Publication from '../models/Publication';
import User from '../models/User';
import { writeAuditLog } from '../utils/audit';
import { PUBLICATION_TYPES } from '../models/Publication';
import { USER_ROLES, type UserRole } from '../constants/roles';
import {
  buildViewerContext,
  canViewPublication,
  filterVisiblePublications,
  PUBLICATION_VISIBILITY,
  type PublicationVisibility,
} from '../utils/publicationAccess';

const pubTypes = PUBLICATION_TYPES as readonly string[];
const visibilityValues = PUBLICATION_VISIBILITY as readonly string[];

function normalizeIp(ip: string | string[] | undefined): string | undefined {
  if (ip === undefined) return undefined;
  return Array.isArray(ip) ? ip[0] : ip;
}

function parseAuthors(body: Record<string, unknown>, creatorId: string): mongoose.Types.ObjectId[] {
  const authors = Array.isArray(body.authors)
    ? (body.authors as string[]).filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];
  if (!authors.includes(creatorId)) {
    authors.unshift(creatorId);
  }
  return authors.map((id) => new mongoose.Types.ObjectId(id));
}

function parseAccessRoles(body: Record<string, unknown>): UserRole[] {
  if (!Array.isArray(body.accessRoles)) return [];
  return body.accessRoles.filter((r): r is UserRole => typeof r === 'string' && USER_ROLES.includes(r as UserRole));
}

function parseVisibility(body: Record<string, unknown>): PublicationVisibility {
  const v = typeof body.visibility === 'string' ? body.visibility : 'lab';
  return visibilityValues.includes(v) ? (v as PublicationVisibility) : 'lab';
}

async function resolveTeamIdForVisibility(
  visibility: PublicationVisibility,
  bodyTeamId: unknown,
  creatorId: string
): Promise<{ teamId: mongoose.Types.ObjectId | null; error?: string }> {
  if (visibility !== 'team' && visibility !== 'team_and_collaborators') {
    return { teamId: null };
  }
  if (bodyTeamId != null && mongoose.Types.ObjectId.isValid(String(bodyTeamId))) {
    return { teamId: new mongoose.Types.ObjectId(String(bodyTeamId)) };
  }
  const creator = await User.findById(creatorId).select('teamId').lean();
  if (creator?.teamId) {
    return { teamId: creator.teamId as mongoose.Types.ObjectId };
  }
  return {
    teamId: null,
    error:
      'Cette visibilité nécessite une équipe : rejoignez une équipe ou choisissez « Tout le laboratoire ».',
  };
}

function applyVisibilityFields(
  doc: InstanceType<typeof Publication>,
  visibility: PublicationVisibility,
  teamId: mongoose.Types.ObjectId | null,
  accessRoles: UserRole[]
): void {
  doc.visibility = visibility;
  doc.teamId = teamId;
  doc.accessRoles = visibility === 'custom_roles' ? accessRoles : [];
}

export const searchPublications = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.json({ publications: [] });
    return;
  }
  const viewer = await buildViewerContext(req.auth.userId, req.auth.role);
  const publications = await Publication.find({ $text: { $search: q } })
    .populate('authors', 'name email')
    .populate('teamId', 'name')
    .limit(50)
    .lean();
  res.json({ publications: filterVisiblePublications(viewer, publications) });
};

export const listPublications = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const viewer = await buildViewerContext(req.auth.userId, req.auth.role);
  const publications = await Publication.find()
    .sort({ year: -1, createdAt: -1 })
    .populate('authors', 'name email')
    .populate('teamId', 'name')
    .limit(200)
    .lean();
  res.json({ publications: filterVisiblePublications(viewer, publications) });
};

export const createPublication = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const visibility = parseVisibility(req.body);
  const { teamId, error: teamError } = await resolveTeamIdForVisibility(
    visibility,
    req.body.teamId,
    req.auth.userId
  );
  if (teamError) {
    res.status(400).json({ error: teamError });
    return;
  }

  const authors = parseAuthors(req.body, req.auth.userId);
  const accessRoles = parseAccessRoles(req.body);

  const doc = await Publication.create({
    title: String(req.body.title).trim(),
    abstract: req.body.abstract != null ? String(req.body.abstract) : '',
    authors,
    createdBy: req.auth.userId,
    journal: req.body.journal != null ? String(req.body.journal) : '',
    year: req.body.year != null ? Number(req.body.year) : undefined,
    doi: req.body.doi != null ? String(req.body.doi) : '',
    keywords: Array.isArray(req.body.keywords) ? req.body.keywords.map(String) : [],
    type:
      typeof req.body.type === 'string' && pubTypes.includes(req.body.type)
        ? req.body.type
        : 'article',
    fileUrl: req.body.fileUrl != null ? String(req.body.fileUrl) : '',
    visibility,
    teamId,
    accessRoles: visibility === 'custom_roles' ? accessRoles : [],
  });

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PUBLICATION_CREATED',
    targetModel: 'Publication',
    targetId: doc._id.toString(),
    newValue: { title: doc.title, visibility: doc.visibility },
    ip: normalizeIp(req.ip),
  });

  res.status(201).json({ publication: doc });
};

export const getPublicationById = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const doc = await Publication.findById(req.params.id)
    .populate('authors', 'name email')
    .populate('teamId', 'name axis')
    .lean();
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const viewer = await buildViewerContext(req.auth.userId, req.auth.role);
  if (!canViewPublication(viewer, doc)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const authorIdList = doc.authors.map((a) =>
    a && typeof a === 'object' && '_id' in a ? String((a as { _id: unknown })._id) : String(a)
  );
  const canEdit =
    req.auth.role === 'super_admin' || authorIdList.includes(req.auth.userId);
  res.json({ publication: doc, canEdit });
};

export const updatePublication = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;
  const doc = await Publication.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const authorsIds = doc.authors.map((a) => a.toString());
  const canEdit =
    req.auth.role === 'super_admin' || authorsIds.includes(req.auth.userId);
  if (!canEdit) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const before = doc.toObject();
  if (req.body.title != null) doc.title = String(req.body.title).trim();
  if (req.body.abstract != null) doc.abstract = String(req.body.abstract);
  if (req.body.journal != null) doc.journal = String(req.body.journal);
  if (req.body.year != null) doc.year = Number(req.body.year);
  if (req.body.doi != null) doc.doi = String(req.body.doi);
  if (req.body.keywords != null) doc.keywords = Array.isArray(req.body.keywords) ? req.body.keywords.map(String) : [];
  if (typeof req.body.type === 'string' && pubTypes.includes(req.body.type)) doc.type = req.body.type;
  if (req.body.fileUrl != null) doc.fileUrl = String(req.body.fileUrl);

  if (req.body.authors != null) {
    doc.authors = parseAuthors(req.body, req.auth.userId);
  }

  if (req.body.visibility != null) {
    const visibility = parseVisibility(req.body);
    const { teamId, error: teamError } = await resolveTeamIdForVisibility(
      visibility,
      req.body.teamId,
      req.auth.userId
    );
    if (teamError) {
      res.status(400).json({ error: teamError });
      return;
    }
    const accessRoles = parseAccessRoles(req.body);
    applyVisibilityFields(doc, visibility, teamId, accessRoles);
  }

  await doc.save();

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PUBLICATION_UPDATED',
    targetModel: 'Publication',
    targetId: doc._id.toString(),
    oldValue: before,
    newValue: doc.toObject(),
    ip: normalizeIp(req.ip),
  });

  res.json({ publication: doc });
};

export const deletePublication = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const doc = await Publication.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const authorsIds = doc.authors.map((a) => a.toString());
  const canDelete =
    req.auth.role === 'super_admin' || authorsIds.includes(req.auth.userId);
  if (!canDelete) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  await doc.deleteOne();
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PUBLICATION_DELETED',
    targetModel: 'Publication',
    targetId: String(req.params.id),
    ip: normalizeIp(req.ip),
  });

  res.status(204).end();
};

export const publicationValidators = [
  body('title').isString().trim().isLength({ min: 1, max: 500 }),
  body('abstract').optional().isString(),
  body('journal').optional().isString(),
  body('year').optional().isInt(),
  body('doi').optional().isString(),
  body('keywords').optional().isArray(),
  body('type').optional().isIn([...PUBLICATION_TYPES]),
  body('fileUrl').optional().isString(),
  body('authors').optional().isArray(),
  body('visibility').optional().isIn([...PUBLICATION_VISIBILITY]),
  body('teamId').optional().isMongoId(),
  body('accessRoles').optional().isArray(),
];
