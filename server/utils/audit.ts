import type { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';

type WriteAuditInput = {
  actorId: Types.ObjectId | string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: unknown;
  ip?: string;
};

export const writeAuditLog = async (input: WriteAuditInput): Promise<void> => {
  await AuditLog.create({
    actorId: input.actorId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    changes: input.changes,
    ip: input.ip,
  });
};
