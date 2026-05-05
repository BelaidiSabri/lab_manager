import mongoose from 'mongoose';

const CANDIDATURE_STATUS = ['pending', 'admitted', 'rejected'] as const;

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    fileUrl: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const concoursCandidatureSchema = new mongoose.Schema(
  {
    concoursId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concours', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: CANDIDATURE_STATUS, default: 'pending' },
    score: { type: Number },
    documents: { type: [documentSchema], default: [] },
  },
  { timestamps: true }
);

concoursCandidatureSchema.index({ concoursId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ConcoursCandidature', concoursCandidatureSchema);
export { CANDIDATURE_STATUS };
