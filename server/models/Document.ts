import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/roles';

const documentLibrarySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accessRoles: { type: [{ type: String, enum: USER_ROLES }], default: [] },
    category: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Document', documentLibrarySchema);
