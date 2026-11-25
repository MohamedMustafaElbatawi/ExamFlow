const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    examEndTime: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'auto_submitted', 'graded'],
      default: 'in_progress',
      index: true,
    },
    gradingStatus: {
      type: String,
      enum: ['pending_grading', 'ready_for_approval', 'approved', 'published'],
      default: 'ready_for_approval',
      index: true,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    gradedAt: {
      type: Date,
    },
    instructorFeedback: {
      type: String,
      default: '',
    },
    isApprovedByInstructor: {
      type: Boolean,
      default: false,
    },
    approvedAt: {
      type: Date,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    // Ordered snapshot IDs for this specific attempt
    questionOrder: [
      {
        type: String,
      },
    ],
    // Shuffled option order mapped per snapshot ID: { "snapshotId": ["opt_3", "opt_1", "opt_2"] }
    optionsOrderMap: {
      type: Map,
      of: [String],
      default: {},
    },
    answers: [
      {
        snapshotId: {
          type: String,
          required: true,
        },
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        selectedOptions: {
          type: [String],
          default: [],
        },
        textAnswer: {
          type: String,
          default: '',
        },
        answeredAt: {
          type: Date,
          default: Date.now,
        },
        scoreAwarded: {
          type: Number,
          default: 0,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
        feedback: {
          type: String,
          default: '',
        },
        gradedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        gradedAt: {
          type: Date,
        },
      },
    ],
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 100,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    gradingHistory: [
      {
        gradedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        gradedAt: {
          type: Date,
          default: Date.now,
        },
        previousScore: Number,
        newScore: Number,
        notes: String,
      },
    ],
    lastHeartbeatAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate simultaneous attempts
examAttemptSchema.index({ exam: 1, student: 1, attemptNumber: 1 }, { unique: true });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
