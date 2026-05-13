import mongoose from 'mongoose';

const ENCADREMENT_REQUEST_STATUS = ['pending', 'accepted', 'refused'] as const;

const encadrementRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    encadreur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ENCADREMENT_REQUEST_STATUS, default: 'pending' },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    refusalReason: { type: String, trim: true, maxlength: 1000 },
    createdSupervisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supervision', default: null },
  },
  { timestamps: true }
);

encadrementRequestSchema.index(
  { student: 1, encadreur: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model('EncadrementRequest', encadrementRequestSchema);
export { ENCADREMENT_REQUEST_STATUS };
