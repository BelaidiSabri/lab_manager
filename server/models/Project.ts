import mongoose from 'mongoose';

const PROJECT_STATUSES = ['planned', 'active', 'suspended', 'completed'] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    type: { type: String, trim: true, default: '' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'planned' },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** One or more équipes (inter-team projects require active collaborations). */
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ResearchTeam' }],
    /** Set when the project is carried by an inter-équipes collaboration. */
    collaboration: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamCollaboration', default: null },
    /** @deprecated Use `teams`. Kept for legacy rows; not written on new saves. */
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchTeam', default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    fundingSource: { type: String, trim: true, default: '' },
    relatedPublications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Publication' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

projectSchema.index({ status: 1, teams: 1 });
projectSchema.index({ status: 1, team: 1 });
projectSchema.index({ leader: 1 });
projectSchema.index({ members: 1 });

export default mongoose.model('Project', projectSchema);
export { PROJECT_STATUSES };
export type { ProjectStatus };
