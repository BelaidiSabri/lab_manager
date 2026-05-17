import mongoose from 'mongoose';

const teamCollaborationSchema = new mongoose.Schema(
  {
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchTeam', required: true },
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchTeam', required: true },
    note: { type: String, trim: true, default: '' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Projects explicitly linked to this collaboration. */
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  },
  { timestamps: true }
);

teamCollaborationSchema.index({ teamA: 1, teamB: 1 }, { unique: true });
teamCollaborationSchema.index({ teamA: 1 });
teamCollaborationSchema.index({ teamB: 1 });

export function normalizeTeamPair(
  teamId1: mongoose.Types.ObjectId | string,
  teamId2: mongoose.Types.ObjectId | string
): [mongoose.Types.ObjectId, mongoose.Types.ObjectId] {
  const a = new mongoose.Types.ObjectId(String(teamId1));
  const b = new mongoose.Types.ObjectId(String(teamId2));
  return a.toString() < b.toString() ? [a, b] : [b, a];
}

export default mongoose.model('TeamCollaboration', teamCollaborationSchema);
