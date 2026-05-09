import mongoose from 'mongoose';

const researchTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    axis: { type: String, required: true, trim: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('ResearchTeam', researchTeamSchema);
