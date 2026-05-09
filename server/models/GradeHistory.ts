import mongoose from 'mongoose';

const gradeHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    oldGrade: { type: String, required: true },
    newGrade: { type: String, required: true },
    concoursId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concours', default: null },
    reason: {
      type: String,
      enum: ['concours', 'graduation', 'thesis_defense'],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: false }
);

gradeHistorySchema.index({ userId: 1, changedAt: -1 });

export default mongoose.model('GradeHistory', gradeHistorySchema);
