import mongoose from 'mongoose';
import { PUBLICATION_VISIBILITY } from '../utils/publicationAccess';
import { USER_ROLES } from '../constants/roles';

const PUBLICATION_TYPES = ['article', 'conference', 'book', 'chapter', 'preprint', 'other'] as const;

const publicationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    abstract: { type: String, trim: true },
    authors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    journal: { type: String, trim: true },
    year: { type: Number },
    doi: { type: String, trim: true },
    keywords: { type: [String], default: [] },
    type: { type: String, enum: PUBLICATION_TYPES, default: 'article' },
    fileUrl: { type: String, trim: true },
    visibility: {
      type: String,
      enum: PUBLICATION_VISIBILITY,
      default: 'lab',
    },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchTeam', default: null },
    accessRoles: { type: [String], enum: USER_ROLES, default: [] },
  },
  { timestamps: true }
);

publicationSchema.index({ title: 'text', keywords: 'text' });
publicationSchema.index({ visibility: 1, teamId: 1 });

export default mongoose.model('Publication', publicationSchema);
export { PUBLICATION_TYPES };
