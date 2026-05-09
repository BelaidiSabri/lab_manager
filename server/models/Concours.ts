import mongoose from 'mongoose';
import { ACADEMIC_GRADES, CONCOURS_TARGET_GRADES } from '../constants/roles';

const CONCOURS_STATUS = ['open', 'closed', 'finished'] as const;

const concoursSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    department: { type: String, required: true, trim: true, default: 'Général' },
    targetGrade: { type: String, enum: CONCOURS_TARGET_GRADES, required: true },
    /**
     * Grade le plus junior encore autorisé à postuler (plus bas dans la hiérarchie = plus grand index).
     * Les grades plus juniors sont exclus (trop peu qualifiés pour ce concours).
     */
    maxJuniorEligibleGrade: { type: String, enum: ACADEMIC_GRADES },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: CONCOURS_STATUS, default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

concoursSchema.index({ targetGrade: 1, department: 1, status: 1 });

export default mongoose.model('Concours', concoursSchema);
export { CONCOURS_STATUS };
