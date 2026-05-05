import type { Request, Response, NextFunction } from 'express';
import { writeAuditLog } from '../utils/audit';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const stripSensitive = (body: unknown): unknown => {
  if (body === null || body === undefined) {
    return body;
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  const o = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(o)) {
    const lower = key.toLowerCase();
    if (lower.includes('password') || lower.includes('token')) {
      o[key] = '[redacted]';
    }
  }
  return o;
};

/**
 * Records a generic audit row for mutating HTTP requests (after authentication when present).
 */
export const auditLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }

  const started = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      return;
    }
    const userId = req.auth?.userId;
    if (!userId) {
      return;
    }
    const action = `${req.method} ${req.originalUrl}`;
    void writeAuditLog({
      userId,
      action,
      targetModel: 'HTTP',
      targetId: req.originalUrl,
      newValue: {
        method: req.method,
        path: req.originalUrl,
        body: stripSensitive(req.body),
        statusCode: res.statusCode,
        durationMs: Date.now() - started,
      },
      ip: req.ip,
    });
  });

  next();
};
