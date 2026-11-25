const Exam = require('../models/Exam');
const Question = require('../models/Question');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ExamAttempt = require('../models/ExamAttempt');
const ActivityLog = require('../models/ActivityLog');

// Helper: draw random questions matching config
const drawRandomQuestions = async (category, randomConfig, excludedIds = []) => {
  const drawn = [];
  const currentExcluded = [...excludedIds];

  for (const rule of randomConfig) {
    const match = {
      category: { $in: [category, 'Both'] },
      status: 'active',
      isArchived: false,
      _id: { $nin: currentExcluded },
    };

    if (rule.topic && rule.topic !== 'all') {
      match.topic = rule.topic;
    }

    if (rule.difficulty && rule.difficulty !== 'all') {
      match.difficulty = rule.difficulty;
    }

    const count = Number(rule.count) || 1;
    const questions = await Question.aggregate([
      { $match: match },
      { $sample: { size: count } },
    ]);

    for (const q of questions) {
      drawn.push({
        ...q,
        configuredMarks: rule.marksPerQuestion || q.marks || 1,
      });
      currentExcluded.push(q._id);
    }
  }

  return drawn;
};

// @desc    Get all exams (Instructor)
// @route   GET /api/exams
// @access  Private (Instructor only)
const getExams = async (req, res, next) => {
  try {
    const { category, status, search, archived, page = 1, limit = 15 } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (archived === 'true') {
      query.isArchived = true;
    } else if (archived !== 'all') {
      query.isArchived = { $ne: true };
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [total, exams] = await Promise.all([
      Exam.countDocuments(query),
      Exam.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    // Attach attempt count and assigned count
    const examIds = exams.map((e) => e._id);
    const attemptCounts = await ExamAttempt.aggregate([
      { $match: { exam: { $in: examIds } } },
      { $group: { _id: '$exam', count: { $sum: 1 } } },
    ]);

    const attemptMap = {};
    attemptCounts.forEach((ac) => {
      attemptMap[ac._id.toString()] = ac.count;
    });

    const examsWithMetrics = exams.map((exam) => ({
      ...exam,
      attemptCount: attemptMap[exam._id.toString()] || 0,
      assignedCount: exam.assignedStudents?.length || 0,
      questionCount:
        exam.status === 'published'
          ? exam.questionSnapshots?.length || 0
          : exam.questions?.length || 0,
    }));

    res.status(200).json({
      success: true,
      count: examsWithMetrics.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      exams: examsWithMetrics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam details
// @route   GET /api/exams/:id
// @access  Private (Instructor only)
const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedStudents', 'name email phone category status')
      .populate('questions.question');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    res.status(200).json({
      success: true,
      exam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new exam (Draft)
// @route   POST /api/exams
// @access  Private (Instructor only)
const createExam = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category = 'PMP',
      selectionMode = 'manual',
      durationMinutes = 60,
      passingScore = 70,
      maxAttempts = 1,
      startDate,
      endDate,
      shuffleQuestions = true,
      shuffleOptions = true,
      allowBackwardNavigation = true,
      autoSubmitOnExpiry = true,
      showResultsImmediately = false,
      allowReviewAnswers = false,
      assignedStudents = [],
      questions = [],
      randomConfig = [],
    } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, start date, and end date are required fields',
      });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    const exam = await Exam.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      category,
      selectionMode,
      durationMinutes: Number(durationMinutes) || 60,
      passingScore: Number(passingScore) || 70,
      maxAttempts: Number(maxAttempts) || 1,
      startDate,
      endDate,
      status: 'draft',
      shuffleQuestions,
      shuffleOptions,
      allowBackwardNavigation,
      autoSubmitOnExpiry,
      showResultsImmediately,
      allowReviewAnswers,
      assignedStudents,
      questions: questions.map((q, idx) => ({
        question: q.question || q.questionId || q._id,
        marks: Number(q.marks) || 1,
        order: idx + 1,
      })),
      randomConfig,
      createdBy: req.user._id,
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_CREATED',
      details: { examId: exam._id, title: exam.title, category: exam.category },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json({
      success: true,
      message: 'Exam draft created successfully',
      exam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private (Instructor only)
const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const {
      title,
      description,
      category,
      selectionMode,
      durationMinutes,
      passingScore,
      maxAttempts,
      startDate,
      endDate,
      shuffleQuestions,
      shuffleOptions,
      allowBackwardNavigation,
      autoSubmitOnExpiry,
      showResultsImmediately,
      allowReviewAnswers,
      assignedStudents,
      questions,
      randomConfig,
    } = req.body;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    if (title) exam.title = title.trim();
    if (description !== undefined) exam.description = description.trim();
    if (durationMinutes) exam.durationMinutes = Number(durationMinutes);
    if (passingScore !== undefined) exam.passingScore = Number(passingScore);
    if (maxAttempts) exam.maxAttempts = Number(maxAttempts);
    if (startDate) exam.startDate = startDate;
    if (endDate) exam.endDate = endDate;
    if (shuffleQuestions !== undefined) exam.shuffleQuestions = shuffleQuestions;
    if (shuffleOptions !== undefined) exam.shuffleOptions = shuffleOptions;
    if (allowBackwardNavigation !== undefined) exam.allowBackwardNavigation = allowBackwardNavigation;
    if (autoSubmitOnExpiry !== undefined) exam.autoSubmitOnExpiry = autoSubmitOnExpiry;
    if (showResultsImmediately !== undefined) exam.showResultsImmediately = showResultsImmediately;
    if (allowReviewAnswers !== undefined) exam.allowReviewAnswers = allowReviewAnswers;
    if (assignedStudents) exam.assignedStudents = assignedStudents;

    // Only allow changing questions and random configuration if exam is still DRAFT
    if (exam.status === 'draft') {
      if (category) exam.category = category;
      if (selectionMode) exam.selectionMode = selectionMode;
      if (questions) {
        exam.questions = questions.map((q, idx) => ({
          question: q.question || q.questionId || q._id,
          marks: Number(q.marks) || 1,
          order: idx + 1,
        }));
      }
      if (randomConfig) exam.randomConfig = randomConfig;
    }

    await exam.save();

    res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      exam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish Exam & Compile Question Snapshots (IMMUTABLE RECORD)
// @route   PATCH /api/exams/:id/publish
// @access  Private (Instructor only)
const publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    if (exam.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Exam is already published',
      });
    }

    const compiledSnapshots = [];
    const usedQuestionIds = [];

    // 1. Process Manual / Hybrid Questions
    if (['manual', 'hybrid'].includes(exam.selectionMode) && exam.questions?.length > 0) {
      for (let i = 0; i < exam.questions.length; i++) {
        const item = exam.questions[i];
        const qDoc = await Question.findById(item.question);
        if (qDoc) {
          compiledSnapshots.push({
            questionId: qDoc._id,
            code: qDoc.code,
            category: qDoc.category,
            topic: qDoc.topic,
            difficulty: qDoc.difficulty,
            type: qDoc.type,
            text: { en: qDoc.text?.en || '', ar: qDoc.text?.ar || '' },
            options: qDoc.options.map((opt) => ({
              id: opt.id,
              text: { en: opt.text?.en || '', ar: opt.text?.ar || '' },
            })),
            correctAnswers: qDoc.correctAnswers || [],
            explanation: { en: qDoc.explanation?.en || '', ar: qDoc.explanation?.ar || '' },
            marks: item.marks || qDoc.marks || 1,
            image: qDoc.image || null,
            order: compiledSnapshots.length + 1,
          });
          usedQuestionIds.push(qDoc._id);
        }
      }
    }

    // 2. Process Random / Hybrid Questions
    if (['random', 'hybrid'].includes(exam.selectionMode) && exam.randomConfig?.length > 0) {
      const drawn = await drawRandomQuestions(exam.category, exam.randomConfig, usedQuestionIds);
      for (const qDoc of drawn) {
        compiledSnapshots.push({
          questionId: qDoc._id,
          code: qDoc.code,
          category: qDoc.category,
          topic: qDoc.topic,
          difficulty: qDoc.difficulty,
          type: qDoc.type,
          text: { en: qDoc.text?.en || '', ar: qDoc.text?.ar || '' },
          options: (qDoc.options || []).map((opt) => ({
            id: opt.id,
            text: { en: opt.text?.en || '', ar: opt.text?.ar || '' },
          })),
          correctAnswers: qDoc.correctAnswers || [],
          explanation: { en: qDoc.explanation?.en || '', ar: qDoc.explanation?.ar || '' },
          marks: qDoc.configuredMarks || qDoc.marks || 1,
          image: qDoc.image || null,
          order: compiledSnapshots.length + 1,
        });
      }
    }

    if (compiledSnapshots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish exam without any resolved questions. Please add questions or adjust random rules.',
      });
    }

    // Calculate total marks
    const totalMarks = compiledSnapshots.reduce((acc, q) => acc + (q.marks || 1), 0);

    // Save compiled immutable snapshot into Exam
    exam.questionSnapshots = compiledSnapshots;
    exam.totalMarks = totalMarks;
    exam.status = 'published';
    exam.publishedAt = new Date();
    await exam.save();

    // Generate notifications for assigned students
    if (exam.assignedStudents && exam.assignedStudents.length > 0) {
      const notifications = exam.assignedStudents.map((studentId) => ({
        recipient: studentId,
        title: `New Exam Published: ${exam.title}`,
        message: `You have been assigned to ${exam.title} (${exam.category}). Duration: ${exam.durationMinutes} mins. Available until ${new Date(exam.endDate).toLocaleDateString()}.`,
        type: 'exam_published',
        link: `/student/exams`,
      }));

      await Notification.insertMany(notifications);
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_PUBLISHED',
      details: {
        examId: exam._id,
        title: exam.title,
        questionsCount: compiledSnapshots.length,
        totalMarks,
        assignedCount: exam.assignedStudents?.length || 0,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: `Exam published successfully with ${compiledSnapshots.length} question snapshots locked in.`,
      exam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate exam into a new draft
// @route   POST /api/exams/:id/duplicate
// @access  Private (Instructor only)
const duplicateExam = async (req, res, next) => {
  try {
    const original = await Exam.findById(req.params.id);
    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const cloned = await Exam.create({
      title: `Copy of ${original.title}`,
      description: original.description,
      category: original.category,
      selectionMode: original.selectionMode,
      durationMinutes: original.durationMinutes,
      passingScore: original.passingScore,
      maxAttempts: original.maxAttempts,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      status: 'draft',
      shuffleQuestions: original.shuffleQuestions,
      shuffleOptions: original.shuffleOptions,
      allowBackwardNavigation: original.allowBackwardNavigation,
      autoSubmitOnExpiry: original.autoSubmitOnExpiry,
      showResultsImmediately: original.showResultsImmediately,
      allowReviewAnswers: original.allowReviewAnswers,
      assignedStudents: original.assignedStudents,
      questions: original.questions,
      randomConfig: original.randomConfig,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Exam duplicated as new draft',
      exam: cloned,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel exam
// @route   PATCH /api/exams/:id/cancel
// @access  Private (Instructor only)
const cancelExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    exam.status = 'cancelled';
    exam.cancelledAt = new Date();
    await exam.save();

    // Notify assigned students about exam cancellation
    if (exam.assignedStudents && exam.assignedStudents.length > 0) {
      const cancelNotifications = exam.assignedStudents.map((studentId) => ({
        recipient: studentId,
        title: `Exam Cancelled: ${exam.title}`,
        message: `The scheduled exam "${exam.title}" (${exam.category}) has been cancelled by the instructor.`,
        type: 'exam_cancelled',
        link: '/student/exams',
      }));

      await Notification.insertMany(cancelNotifications);
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_CANCELLED',
      details: { examId: exam._id, title: exam.title },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Exam cancelled successfully',
      exam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive exam
// @route   PATCH /api/exams/:id/archive
// @access  Private (Instructor only)
const archiveExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    exam.isArchived = true;
    exam.archivedAt = new Date();
    await exam.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_ARCHIVED',
      details: { examId: exam._id, title: exam.title },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Exam archived successfully',
      exam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore archived exam
// @route   PATCH /api/exams/:id/restore
// @access  Private (Instructor only)
const restoreExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    exam.isArchived = false;
    exam.archivedAt = null;
    await exam.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_RESTORED',
      details: { examId: exam._id, title: exam.title },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Exam restored successfully',
      exam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete exam (only if draft with 0 attempts)
// @route   DELETE /api/exams/:id
// @access  Private (Instructor only)
const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    if (exam.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Published or closed exams cannot be permanently deleted. Please archive the exam instead.',
      });
    }

    const attemptsCount = await ExamAttempt.countDocuments({ exam: exam._id });
    if (attemptsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete exam with ${attemptsCount} recorded student attempts. Please archive the exam instead.`,
      });
    }

    await Exam.findByIdAndDelete(exam._id);

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_DELETED',
      details: { examId: exam._id, title: exam.title },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Exam draft deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExams,
  getExamById,
  createExam,
  updateExam,
  publishExam,
  duplicateExam,
  cancelExam,
  deleteExam,
  archiveExam,
  restoreExam,
};
