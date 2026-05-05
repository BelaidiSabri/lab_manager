import mongoose from 'mongoose';

const socialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    url: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const diplomaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    year: { type: Number },
    institution: { type: String, trim: true },
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    photo: { type: String, trim: true },
    bio: { type: String, trim: true },
    researchAxe: { type: String, trim: true },
    socialLinks: { type: [socialLinkSchema], default: [] },
    diplomas: { type: [diplomaSchema], default: [] },
    institution: { type: String, trim: true },
    /** Optional rich profile fields used by the UI until dedicated modules consolidate data */
    academicProfile: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('Profile', profileSchema);
