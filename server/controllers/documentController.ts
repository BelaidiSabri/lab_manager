import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import Document from '../models/Document';
import { writeAuditLog } from '../utils/audit';
import { canViewDocument } from '../utils/documentAccess';
import type { UserRole } from '../constants/roles';
import { isUserRole } from '../constants/roles';

function normalizeIp(ip: string | string[] | undefined): string | undefined {
  if (ip === undefined) return undefined;
  return Array.isArray(ip) ? ip[0] : ip;
}

export const listDocuments = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const all = await Document.find().sort({ createdAt: -1 }).populate('uploadedBy', 'name email').lean();
  const role = req.auth.role as UserRole;
  const visible = all.filter((d) =>
    canViewDocument(role, (d.accessRoles as string[] | undefined) ?? [])
  );
  res.json({ documents: visible });
};

export const createDocument = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array() });
    return;
  }
  if (!req.auth) return;

  if (!req.file) {
    res.status(400).json({ error: 'File is required' });
    return;
  }

  const title = String(req.body.title || req.file.originalname).trim();
  const category = req.body.category != null ? String(req.body.category).trim() : '';
  let accessRoles: string[] = [];
  if (req.body.accessRoles != null) {
    if (typeof req.body.accessRoles === 'string') {
      try {
        const parsed = JSON.parse(req.body.accessRoles) as unknown;
        if (Array.isArray(parsed)) accessRoles = parsed.filter((r) => typeof r === 'string' && isUserRole(r));
      } catch {
        accessRoles = req.body.accessRoles
          .split(',')
          .map((s: string) => s.trim())
          .filter((r: string) => isUserRole(r));
      }
    } else if (Array.isArray(req.body.accessRoles)) {
      accessRoles = req.body.accessRoles.filter(
        (r: unknown): r is string => typeof r === 'string' && isUserRole(r)
      );
    }
  }

  const publicPath = `/uploads/${req.file.filename}`;

  const doc = await Document.create({
    title,
    fileUrl: publicPath,
    uploadedBy: req.auth.userId,
    accessRoles,
    category,
  });

  await writeAuditLog({
    userId: req.auth.userId,
    action: 'DOCUMENT_CREATED',
    targetModel: 'Document',
    targetId: doc._id.toString(),
    newValue: { title, fileUrl: publicPath },
    ip: normalizeIp(req.ip),
  });

  const populated = await Document.findById(doc._id).populate('uploadedBy', 'name email').lean();
  res.status(201).json({ document: populated });
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const doc = await Document.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const uploader = doc.uploadedBy.toString();
  if (req.auth.role !== 'super_admin' && uploader !== req.auth.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const filePath = doc.fileUrl.startsWith('/uploads/')
    ? path.join(process.cwd(), doc.fileUrl.replace(/^\//, ''))
    : '';
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }

  await doc.deleteOne();
  await writeAuditLog({
    userId: req.auth.userId,
    action: 'DOCUMENT_DELETED',
    targetModel: 'Document',
    targetId: String(req.params.id),
    ip: normalizeIp(req.ip),
  });

  res.status(204).end();
};

export const documentUploadValidators = [
  body('title').optional().isString().trim().isLength({ max: 300 }),
  body('category').optional().isString().trim(),
];
