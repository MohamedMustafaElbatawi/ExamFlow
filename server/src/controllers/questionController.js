const Question = require('../models/Question');
const Exam = require('../models/Exam');
const ActivityLog = require('../models/ActivityLog');

// Generate unique question code helper
const generateQuestionCode = async (category = 'PMP') => {
  const prefix = `Q-${category === 'Both' ? 'GEN' : category}`;
  const count = await Question.countDocuments();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${count + 1}-${randomSuffix}`;
};

// @desc    Get questions with filters, search, and pagination
// @route   GET /api/questions
// @access  Private (Instructor only)
const getQuestions = async (req, res, next) => {
  try {
    const {
      search,
      category,
      topic,
      type,
      difficulty,
      status = 'active',
      page = 1,
      limit = 15,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {};

    // Status filter
    if (status === 'active') {
      query.status = 'active';
      query.isArchived = false;
    } else if (status === 'archived') {
      query.status = 'archived';
      query.isArchived = true;
    } // 'all' leaves status unfiltered

    // Category filter
    if (category && category !== 'all') {
      query.category = { $in: [category, 'Both'] };
    }

    // Topic filter
    if (topic && topic !== 'all') {
      query.topic = topic;
    }

    // Question Type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Difficulty filter
    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }

    // Search filter across EN & AR text, topic, code
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'text.en': searchRegex },
        { 'text.ar': searchRegex },
        { topic: searchRegex },
        { code: searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;
    const sortDirection = order === 'asc' ? 1 : -1;

    const [total, questions] = await Promise.all([
      Question.countDocuments(query),
      Question.find(query)
        .populate('createdBy', 'name email')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      count: questions.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single question by ID
// @route   GET /api/questions/:id
// @access  Private (Instructor only)
const getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate('createdBy', 'name email');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new question
// @route   POST /api/questions
// @access  Private (Instructor only)
const createQuestion = async (req, res, next) => {
  try {
    const {
      code,
      category = 'PMP',
      topic,
      difficulty = 'medium',
      type = 'single_choice',
      text = {},
      options = [],
      correctAnswers = [],
      explanation = {},
      marks = 1,
      image = null,
    } = req.body;

    // Validation: at least one text field must be present
    const hasEnText = text.en && text.en.trim().length > 0;
    const hasArText = text.ar && text.ar.trim().length > 0;
    if (!hasEnText && !hasArText) {
      return res.status(400).json({
        success: false,
        message: 'Question text in either English or Arabic is required',
      });
    }

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a topic for the question',
      });
    }

    // Type-specific validations
    if (['single_choice', 'multiple_choice', 'true_false'].includes(type)) {
      if (!options || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Objective questions must have at least 2 answer options',
        });
      }

      if (!correctAnswers || correctAnswers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please select at least one correct answer option',
        });
      }

      if (['single_choice', 'true_false'].includes(type) && correctAnswers.length !== 1) {
        return res.status(400).json({
          success: false,
          message: `${type === 'true_false' ? 'True/False' : 'Single-choice'} questions must have exactly one correct answer`,
        });
      }
    }

    // Duplicate detection: check if duplicate text exists
    const duplicateQuery = {
      $or: [],
    };
    if (hasEnText) duplicateQuery.$or.push({ 'text.en': text.en.trim() });
    if (hasArText) duplicateQuery.$or.push({ 'text.ar': text.ar.trim() });

    if (duplicateQuery.$or.length > 0) {
      const existing = await Question.findOne({
        ...duplicateQuery,
        category: { $in: [category, 'Both'] },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Possible duplicate question detected (Matches existing question code: ${existing.code})`,
          existingId: existing._id,
        });
      }
    }

    const questionCode = code && code.trim() ? code.trim() : await generateQuestionCode(category);

    const question = await Question.create({
      code: questionCode,
      category,
      topic: topic.trim(),
      difficulty,
      type,
      text: {
        en: text.en ? text.en.trim() : '',
        ar: text.ar ? text.ar.trim() : '',
      },
      options: options.map((opt, idx) => ({
        id: opt.id || `opt_${idx + 1}`,
        text: {
          en: opt.text?.en || '',
          ar: opt.text?.ar || '',
        },
      })),
      correctAnswers,
      explanation: {
        en: explanation.en ? explanation.en.trim() : '',
        ar: explanation.ar ? explanation.ar.trim() : '',
      },
      marks: Number(marks) || 1,
      image: image || null,
      status: 'active',
      isArchived: false,
      createdBy: req.user._id,
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'QUESTION_CREATED',
      details: { questionId: question._id, code: question.code, topic: question.topic },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Instructor only)
const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    const {
      code,
      category,
      topic,
      difficulty,
      type,
      text,
      options,
      correctAnswers,
      explanation,
      marks,
      image,
      status,
    } = req.body;

    if (category) question.category = category;
    if (topic) question.topic = topic.trim();
    if (difficulty) question.difficulty = difficulty;
    if (type) question.type = type;
    if (marks !== undefined) question.marks = Number(marks) || 1;
    if (image !== undefined) question.image = image;
    if (code) question.code = code.trim();

    if (status && ['active', 'archived'].includes(status)) {
      question.status = status;
      question.isArchived = status === 'archived';
    }

    if (text) {
      question.text = {
        en: text.en !== undefined ? text.en.trim() : question.text.en,
        ar: text.ar !== undefined ? text.ar.trim() : question.text.ar,
      };
    }

    if (options) {
      question.options = options.map((opt, idx) => ({
        id: opt.id || `opt_${idx + 1}`,
        text: {
          en: opt.text?.en || '',
          ar: opt.text?.ar || '',
        },
      }));
    }

    if (correctAnswers) question.correctAnswers = correctAnswers;

    if (explanation) {
      question.explanation = {
        en: explanation.en !== undefined ? explanation.en.trim() : question.explanation.en,
        ar: explanation.ar !== undefined ? explanation.ar.trim() : question.explanation.ar,
      };
    }

    await question.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'QUESTION_UPDATED',
      details: { questionId: question._id, code: question.code },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle archive status for question
// @route   PATCH /api/questions/:id/archive
// @access  Private (Instructor only)
const toggleArchive = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    const nextArchived = !question.isArchived;
    question.isArchived = nextArchived;
    question.status = nextArchived ? 'archived' : 'active';
    await question.save();

    res.status(200).json({
      success: true,
      message: `Question ${nextArchived ? 'archived' : 'restored'} successfully`,
      isArchived: question.isArchived,
      status: question.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk archive questions
// @route   POST /api/questions/bulk-archive
// @access  Private (Instructor only)
const bulkArchive = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of question IDs to archive',
      });
    }

    const result = await Question.updateMany(
      { _id: { $in: ids } },
      { $set: { isArchived: true, status: 'archived' } }
    );

    res.status(200).json({
      success: true,
      message: `Successfully archived ${result.modifiedCount} questions`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete question (Archives if referenced in any exam)
// @route   DELETE /api/questions/:id
// @access  Private (Instructor only)
const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Check if question is referenced in any existing exam
    const examReference = await Exam.findOne({ 'questions.question': question._id });

    if (examReference) {
      // Business rule: Do not permanently delete questions already used in exams. Archive instead!
      question.isArchived = true;
      question.status = 'archived';
      await question.save();

      return res.status(200).json({
        success: true,
        archivedInstead: true,
        message: `Question is referenced in exam "${examReference.title}". It has been archived instead of permanently deleted to preserve exam integrity.`,
      });
    }

    // If not referenced in any exam, perform hard delete
    await Question.findByIdAndDelete(question._id);

    await ActivityLog.create({
      user: req.user._id,
      action: 'QUESTION_DELETED',
      details: { questionId: question._id, code: question.code },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Question permanently deleted from bank',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload image for a question
// @route   POST /api/questions/upload-image
// @access  Private (Instructor only)
const uploadQuestionImageHandler = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file uploaded',
    });
  }

  const imageUrl = `/uploads/questions/${req.file.filename}`;
  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully',
    imageUrl,
  });
};

// @desc    Get distinct topics list for question bank
// @route   GET /api/questions/topics
// @access  Private (Instructor only)
const getTopics = async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category && category !== 'all') {
      filter.category = { $in: [category, 'Both'] };
    }
    const topics = await Question.distinct('topic', filter);
    res.status(200).json({
      success: true,
      topics: topics.filter(Boolean).sort(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary statistics of the question bank
// @route   GET /api/questions/stats
// @access  Private (Instructor only)
const getStats = async (req, res, next) => {
  try {
    const [total, pmpCount, mpaCount, archivedCount, singleCount, multipleCount, tfCount, essayCount] =
      await Promise.all([
        Question.countDocuments({ isArchived: false }),
        Question.countDocuments({ category: { $in: ['PMP', 'Both'] }, isArchived: false }),
        Question.countDocuments({ category: { $in: ['MPA', 'Both'] }, isArchived: false }),
        Question.countDocuments({ isArchived: true }),
        Question.countDocuments({ type: 'single_choice', isArchived: false }),
        Question.countDocuments({ type: 'multiple_choice', isArchived: false }),
        Question.countDocuments({ type: 'true_false', isArchived: false }),
        Question.countDocuments({ type: 'essay', isArchived: false }),
      ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        pmpCount,
        mpaCount,
        archivedCount,
        byType: {
          single_choice: singleCount,
          multiple_choice: multipleCount,
          true_false: tfCount,
          essay: essayCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  toggleArchive,
  bulkArchive,
  deleteQuestion,
  uploadQuestionImageHandler,
  getTopics,
  getStats,
};
