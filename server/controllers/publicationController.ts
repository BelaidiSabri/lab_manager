import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Publication from '../models/Publication';
import { writeAuditLog } from '../utils/audit';
import { PUBLICATION_TYPES } from '../models/Publication';

const pubTypes = PUBLICATION_TYPES as readonly string[];

function normalizeIp(ip: string | string[] | undefined): string | undefined {
  if (ip === undefined) return undefined;
  return Array.isArray(ip) ? ip[0] : ip;
}

export const searchPublications = async (req: Request, res: Response): Promise<void> => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.json({ publications: [] });
    return;
  }
  const publications = await Publication.find({ $text: { $search: q } })
    .populate('authors', 'name email')
    .limit(50)
    .lean();
  res.json({ publications });
};

export const listPublications = async (_req: Request, res: Response): Promise<void> => {
  const publications = await Publication.find()
    .sort({ year: -1, createdAt: -1 })
    .populate('authors', 'name email')
    .limit(200)
    .lean();
  res.json({ publications });
};

export const createPublication = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  const authors = Array.isArray(req.body.authors)
    ? (req.body.authors as string[]).filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];
  if (!authors.includes(req.auth.userId)) {
    authors.unshift(req.auth.userId);
  }

  const doc = await Publication.create({
    title: String(req.body.title).trim(),
    abstract: req.body.abstract != null ? String(req.body.abstract) : '',
    authors,
    journal: req.body.journal != null ? String(req.body.journal) : '',
    year: req.body.year != null ? Number(req.body.year) : undefined,
    doi: req.body.doi != null ? String(req.body.doi) : '',
    keywords: Array.isArray(req.body.keywords) ? req.body.keywords.map(String) : [],
    type:
      typeof req.body.type === 'string' && pubTypes.includes(req.body.type)
        ? req.body.type
        : 'article',
    fileUrl: req.body.fileUrl != null ? String(req.body.fileUrl) : '',
  });

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'PUBLICATION_CREATED',
    targetModel: 'Publication',
    targetId: doc._id.toString(),
    newValue: { title: doc.title },
    ip: normalizeIp(req.ip),
  });

  res.status(201).json({ publication: doc });
};

export const getPublicationById = async (req: Request, res: Response): Promise<void> => {
  const doc = await Publication.findById(req.params.id).populate('authors', 'name email').lean();
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ publication: doc });
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
  if (req.body.authors != null && req.auth.role === 'super_admin') {
    doc.authors = (req.body.authors as string[])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
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
];
