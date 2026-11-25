const mongoose = require('mongoose');

const questionSnapshotSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    code: String,
    category: String,
    topic: String,
    difficulty: String,
    type: String,
    text: {
      en: { type: String, default: '' },
      ar: { type: String, default: '' },
    },
    options: [
      {
        id: String,
        text: {
          en: { type: String, default: '' },
          ar: { type: String, default: '' },
        },
      },
    ],
    correctAnswers: [String],
    explanation: {
      en: { type: String, default: '' },
      ar: { type: String, default: '' },
    },
    marks: {
      type: Number,
      default: 1,
    },
    image: {
      type: String,
      default: null,
    },
    order: {
      type: Number,
      default: 1,
    },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide exam title'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['PMP', 'MPA'],
      required: true,
      default: 'PMP',
    },
    selectionMode: {
      type: String,
      enum: ['manual', 'random', 'hybrid'],
      default: 'manual',
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 60,
      min: [5, 'Duration must be at least 5 minutes'],
    },
    passingScore: {
      type: Number,
      required: true,
      default: 70, // percentage
      min: 0,
      max: 100,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1,
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide exam start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide exam end date'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
    shuffleQuestions: {
      type: Boolean,
      default: true,
    },
    shuffleOptions: {
      type: Boolean,
      default: true,
    },
    allowBackwardNavigation: {
      type: Boolean,
      default: true,
    },
    autoSubmitOnExpiry: {
      type: Boolean,
      default: true,
    },
    showResultsImmediately: {
      type: Boolean,
      default: false,
    },
    allowReviewAnswers: {
      type: Boolean,
      default: false,
    },
    resultsPublished: {
      type: Boolean,
      default: false,
    },
    resultsPublishedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    assignedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // For manual / hybrid selection draft
    questions: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
        marks: {
          type: Number,
          default: 1,
        },
        order: {
          type: Number,
          default: 1,
        },
      },
    ],
    // For random pool configurations
    randomConfig: [
      {
        topic: { type: String, default: 'all' },
        difficulty: { type: String, enum: ['all', 'easy', 'medium', 'hard'], default: 'all' },
        count: { type: Number, default: 5 },
        marksPerQuestion: { type: Number, default: 1 },
      },
    ],
    // IMMUTABLE SNAPSHOT COMPILED AT PUBLICATION
    questionSnapshots: [questionSnapshotSchema],
    publishedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for dynamic status (scheduled, active, closed)
examSchema.virtual('computedStatus').get(function () {
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'draft') return 'draft';
  const now = new Date();
  if (now < this.startDate) return 'scheduled';
  if (now >= this.startDate && now <= this.endDate) return 'active';
  return 'closed';
});

examSchema.set('toJSON', { virtuals: true });
examSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Exam', examSchema);
