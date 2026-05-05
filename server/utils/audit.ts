import type { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';

type WriteAuditInput = {
  userId: Types.ObjectId | string;
  action: string;
  targetModel: string;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
};

export const writeAuditLog = async (input: WriteAuditInput): Promise<void> => {
  await AuditLog.create({
    userId: input.userId,
    action: input.action,
    targetModel: input.targetModel,
    targetId: input.targetId,
    oldValue: input.oldValue,
    newValue: input.newValue,
    ip: input.ip,
  });
};
