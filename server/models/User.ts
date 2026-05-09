import mongoose from 'mongoose';
import { USER_ROLES, ACADEMIC_GRADES, ACADEMIC_PROGRAMS } from '../constants/roles';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Stored bcrypt hash (spec field name: password) */
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true },
    currentGrade: { type: String, enum: ACADEMIC_GRADES, default: undefined },
    /** Master / Doctorat — indépendant du grade de carrière (concours). */
    academicProgram: { type: String, enum: ACADEMIC_PROGRAMS, default: 'none' },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchTeam', default: null },
    isFirstLogin: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

userSchema.pre('validate', async function () {
  if (this.role !== 'super_admin' && (this.currentGrade === undefined || this.currentGrade === null)) {
    throw new Error('currentGrade is required for non–super_admin users');
  }
  if (this.role === 'super_admin') {
    this.set('currentGrade', undefined);
  }
});

export default mongoose.model('User', userSchema);
