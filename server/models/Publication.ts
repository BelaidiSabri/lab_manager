import mongoose from 'mongoose';

const PUBLICATION_TYPES = ['article', 'conference', 'book', 'chapter', 'preprint', 'other'] as const;

const publicationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    abstract: { type: String, trim: true },
    authors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    journal: { type: String, trim: true },
    year: { type: Number },
    doi: { type: String, trim: true },
    keywords: { type: [String], default: [] },
    type: { type: String, enum: PUBLICATION_TYPES, default: 'article' },
    fileUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

publicationSchema.index({ title: 'text', keywords: 'text' });

export default mongoose.model('Publication', publicationSchema);
export { PUBLICATION_TYPES };
