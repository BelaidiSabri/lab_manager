import mongoose from 'mongoose';

const SUPERVISION_TYPES = ['thesis', 'project'] as const;
const SUPERVISION_STATUSES = ['active', 'completed', 'suspended'] as const;

const supervisionSchema = new mongoose.Schema(
  {
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supervised: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: SUPERVISION_TYPES, required: true },
    title: { type: String, trim: true },
    status: { type: String, enum: SUPERVISION_STATUSES, default: 'active' },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

supervisionSchema.index({ supervisor: 1, supervised: 1 });

export default mongoose.model('Supervision', supervisionSchema);
export { SUPERVISION_TYPES, SUPERVISION_STATUSES };
