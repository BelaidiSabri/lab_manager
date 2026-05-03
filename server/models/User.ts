import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/roles';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: USER_ROLES, required: true },
    /** Validated at API layer (Zod); flexible JSON for publications and future fields */
    academicProfile: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
