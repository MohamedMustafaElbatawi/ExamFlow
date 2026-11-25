const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      en: { type: String, default: '' },
      ar: { type: String, default: '' },
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['PMP', 'MPA', 'Both'],
      required: [true, 'Please select a course category (PMP, MPA, or Both)'],
      default: 'PMP',
    },
    topic: {
      type: String,
      required: [true, 'Please specify a question topic'],
      trim: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    type: {
      type: String,
      enum: ['single_choice', 'multiple_choice', 'true_false', 'essay'],
      required: [true, 'Please specify question type'],
      default: 'single_choice',
    },
    text: {
      en: {
        type: String,
        default: '',
        trim: true,
      },
      ar: {
        type: String,
        default: '',
        trim: true,
      },
    },
    options: {
      type: [optionSchema],
      default: [],
    },
    correctAnswers: {
      type: [String],
      default: [],
    },
    explanation: {
      en: { type: String, default: '' },
      ar: { type: String, default: '' },
    },
    marks: {
      type: Number,
      required: true,
      default: 1,
      min: [0.5, 'Marks must be at least 0.5'],
    },
    image: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
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

// Compound index for quick searching and filtering
questionSchema.index({ category: 1, topic: 1, type: 1, status: 1 });

module.exports = mongoose.model('Question', questionSchema);
