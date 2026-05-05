import mongoose from 'mongoose';

const PROJECT_STATUSES = ['planned', 'active', 'paused', 'completed', 'archived'] as const;

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: PROJECT_STATUSES, default: 'active' },
    startDate: { type: Date },
    endDate: { type: Date },
    relatedPublications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Publication' }],
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
export { PROJECT_STATUSES };
