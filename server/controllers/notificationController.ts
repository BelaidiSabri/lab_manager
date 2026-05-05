import type { Request, Response } from 'express';
import Notification from '../models/Notification';

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
  const q = unreadOnly ? { userId: req.auth.userId, read: false } : { userId: req.auth.userId };
  const rows = await Notification.find(q).sort({ createdAt: -1 }).limit(100).lean();
  const unreadCount = await Notification.countDocuments({ userId: req.auth.userId, read: false });
  res.json({ notifications: rows, unreadCount });
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  const doc = await Notification.findOne({ _id: req.params.id, userId: req.auth.userId });
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  doc.read = true;
  await doc.save();
  res.json({ notification: doc });
};

export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;
  await Notification.updateMany({ userId: req.auth.userId, read: false }, { $set: { read: true } });
  res.json({ ok: true });
};
