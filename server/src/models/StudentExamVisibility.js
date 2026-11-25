const mongoose = require('mongoose');

const studentExamVisibilitySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: true,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to guarantee one visibility record per student and exam
studentExamVisibilitySchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('StudentExamVisibility', studentExamVisibilitySchema);
