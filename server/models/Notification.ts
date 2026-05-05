import mongoose from 'mongoose';

const NOTIFICATION_KINDS = ['concours_admitted', 'concours_rejected'] as const;

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    concoursId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concours' },
    candidatureId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
export { NOTIFICATION_KINDS };
