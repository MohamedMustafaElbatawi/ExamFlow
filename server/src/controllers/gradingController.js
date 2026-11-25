const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get all exam attempts with filters and statistics
// @route   GET /api/grading/attempts
// @access  Private (Instructor only)
const getAttempts = async (req, res, next) => {
  try {
    const {
      examId,
      category,
      gradingStatus,
      studentId,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      status: { $in: ['submitted', 'auto_submitted', 'graded'] },
    };

    if (examId) query.exam = examId;
    if (studentId) query.student = studentId;
    if (gradingStatus && gradingStatus !== 'all') {
      query.gradingStatus = gradingStatus;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Base query without pagination for stats
    const [allMatching, totalCount] = await Promise.all([
      ExamAttempt.find(query)
        .populate('student', 'name email phone category')
        .populate('exam', 'title category durationMinutes passingScore totalMarks allowReviewAnswers')
        .sort({ submittedAt: -1 }),
      ExamAttempt.countDocuments(query),
    ]);

    // Apply in-memory category & search filter if needed
    let filtered = allMatching;
    if (category && category !== 'all') {
      filtered = filtered.filter((att) => att.exam?.category === category);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (att) =>
          att.student?.name?.toLowerCase().includes(q) ||
          att.student?.email?.toLowerCase().includes(q) ||
          att.exam?.title?.toLowerCase().includes(q)
      );
    }

    // Compute stats
    const stats = {
      total: filtered.length,
      pendingGrading: filtered.filter((a) => a.gradingStatus === 'pending_grading').length,
      readyForApproval: filtered.filter((a) => a.gradingStatus === 'ready_for_approval').length,
      approved: filtered.filter((a) => a.gradingStatus === 'approved').length,
      published: filtered.filter((a) => a.gradingStatus === 'published').length,
    };

    const paginatedAttempts = filtered.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      stats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limitNum) || 1,
      },
      attempts: paginatedAttempts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed attempt review for instructor
// @route   GET /api/grading/attempts/:id
// @access  Private (Instructor only)
const getAttemptDetails = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id)
      .populate('student', 'name email phone category')
      .populate('exam')
      .populate('gradedBy', 'name email');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    const exam = attempt.exam;
    const snapshotMap = {};
    if (exam && exam.questionSnapshots) {
      exam.questionSnapshots.forEach((s) => {
        snapshotMap[s._id.toString()] = s;
      });
    }

    const answersMap = {};
    attempt.answers.forEach((ans) => {
      answersMap[ans.snapshotId] = ans;
    });

    const questionOrder =
      attempt.questionOrder && attempt.questionOrder.length > 0
        ? attempt.questionOrder
        : exam?.questionSnapshots?.map((s) => s._id.toString()) || [];

    const questions = questionOrder
      .map((sid, idx) => {
        const snap = snapshotMap[sid];
        if (!snap) return null;
        const ans = answersMap[sid] || {};

        return {
          snapshotId: sid,
          questionIndex: idx + 1,
          code: snap.code,
          category: snap.category,
          topic: snap.topic,
          difficulty: snap.difficulty,
          type: snap.type,
          text: snap.text,
          options: snap.options,
          correctAnswers: snap.correctAnswers,
          explanation: snap.explanation,
          marks: snap.marks,
          image: snap.image,
          studentAnswer: {
            selectedOptions: ans.selectedOptions || [],
            textAnswer: ans.textAnswer || '',
            scoreAwarded: typeof ans.scoreAwarded === 'number' ? ans.scoreAwarded : 0,
            isCorrect: ans.isCorrect || false,
            feedback: ans.feedback || '',
            gradedAt: ans.gradedAt,
            gradedBy: ans.gradedBy,
          },
        };
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      attempt: {
        _id: attempt._id,
        exam: {
          _id: exam?._id,
          title: exam?.title,
          category: exam?.category,
          durationMinutes: exam?.durationMinutes,
          passingScore: exam?.passingScore,
          totalMarks: exam?.totalMarks,
          allowReviewAnswers: exam?.allowReviewAnswers,
        },
        student: attempt.student,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
        gradingStatus: attempt.gradingStatus,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        isApprovedByInstructor: attempt.isApprovedByInstructor,
        approvedAt: attempt.approvedAt,
        isPublished: attempt.isPublished,
        publishedAt: attempt.publishedAt,
        instructorFeedback: attempt.instructorFeedback,
        gradedBy: attempt.gradedBy,
        gradedAt: attempt.gradedAt,
        gradingHistory: attempt.gradingHistory || [],
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually grade or override score on a specific question
// @route   PATCH /api/grading/attempts/:id/grade-question
// @access  Private (Instructor only)
const gradeQuestion = async (req, res, next) => {
  try {
    const { snapshotId, scoreAwarded, feedback } = req.body;

    if (!snapshotId || typeof scoreAwarded !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'SnapshotId and numeric scoreAwarded are required',
      });
    }

    const attempt = await ExamAttempt.findById(req.params.id).populate('exam');
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    const exam = attempt.exam;
    const snap = exam?.questionSnapshots?.find((s) => s._id.toString() === snapshotId);
    if (!snap) {
      return res.status(404).json({
        success: false,
        message: 'Question snapshot not found in exam',
      });
    }

    const maxQuestionMarks = snap.marks || 1;
    if (scoreAwarded < 0 || scoreAwarded > maxQuestionMarks) {
      return res.status(400).json({
        success: false,
        message: `Awarded score must be between 0 and maximum question marks (${maxQuestionMarks})`,
      });
    }

    // Find or initialize answer record
    let ans = attempt.answers.find((a) => a.snapshotId === snapshotId);
    const previousScore = attempt.totalScore;
    const previousAwarded = ans ? ans.scoreAwarded || 0 : 0;

    if (!ans) {
      ans = {
        snapshotId,
        selectedOptions: [],
        textAnswer: '',
        answeredAt: new Date(),
      };
      attempt.answers.push(ans);
    }

    ans.scoreAwarded = scoreAwarded;
    ans.isCorrect = scoreAwarded === maxQuestionMarks;
    ans.feedback = feedback !== undefined ? feedback : ans.feedback;
    ans.gradedBy = req.user._id;
    ans.gradedAt = new Date();

    // Recalculate totalScore
    let newTotal = 0;
    attempt.answers.forEach((a) => {
      newTotal += typeof a.scoreAwarded === 'number' ? a.scoreAwarded : 0;
    });

    attempt.totalScore = newTotal;
    const maxScore = exam?.totalMarks || attempt.maxScore || 100;
    attempt.percentage = maxScore > 0 ? Math.round((newTotal / maxScore) * 100) : 0;
    attempt.isPassed = attempt.percentage >= (exam?.passingScore || 70);
    attempt.status = 'graded';

    // Check if any essay questions still unreviewed
    const snapshotMap = {};
    exam.questionSnapshots.forEach((s) => {
      snapshotMap[s._id.toString()] = s;
    });

    let pendingEssayCount = 0;
    exam.questionSnapshots.forEach((s) => {
      if (s.type === 'essay') {
        const studentAns = attempt.answers.find((a) => a.snapshotId === s._id.toString());
        if (!studentAns || !studentAns.gradedAt) {
          pendingEssayCount++;
        }
      }
    });

    if (pendingEssayCount === 0 && attempt.gradingStatus === 'pending_grading') {
      attempt.gradingStatus = 'ready_for_approval';
    }

    // Audit log
    attempt.gradingHistory.push({
      gradedBy: req.user._id,
      gradedAt: new Date(),
      previousScore,
      newScore: newTotal,
      notes: `Graded question [${snap.code || snapshotId}]: ${scoreAwarded}/${maxQuestionMarks} pts. (Was: ${previousAwarded} pts)`,
    });

    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Question graded successfully',
      totalScore: attempt.totalScore,
      percentage: attempt.percentage,
      isPassed: attempt.isPassed,
      gradingStatus: attempt.gradingStatus,
      answer: ans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve attempt result
// @route   PATCH /api/grading/attempts/:id/approve
// @access  Private (Instructor only)
const approveAttempt = async (req, res, next) => {
  try {
    const { instructorFeedback } = req.body;

    const attempt = await ExamAttempt.findById(req.params.id).populate('exam');
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    if (attempt.gradingStatus === 'pending_grading') {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve attempt with pending essay evaluations. Please grade all essays first.',
      });
    }

    const previousScore = attempt.totalScore;
    attempt.gradingStatus = 'approved';
    attempt.isApprovedByInstructor = true;
    attempt.approvedAt = new Date();
    attempt.gradedBy = req.user._id;
    attempt.gradedAt = new Date();
    if (instructorFeedback !== undefined) {
      attempt.instructorFeedback = instructorFeedback;
    }

    attempt.gradingHistory.push({
      gradedBy: req.user._id,
      gradedAt: new Date(),
      previousScore,
      newScore: attempt.totalScore,
      notes: 'Attempt result approved by instructor',
    });

    await attempt.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'ATTEMPT_APPROVED',
      details: { attemptId: attempt._id, student: attempt.student, totalScore: attempt.totalScore },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Attempt result approved successfully',
      attempt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish single attempt result
// @route   PATCH /api/grading/attempts/:id/publish
// @access  Private (Instructor only)
const publishAttempt = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id).populate('exam');
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    if (attempt.gradingStatus === 'pending_grading') {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish attempt with pending essay evaluations. Grade and approve first.',
      });
    }

    attempt.gradingStatus = 'published';
    attempt.isApprovedByInstructor = true;
    attempt.approvedAt = attempt.approvedAt || new Date();
    attempt.isPublished = true;
    attempt.publishedAt = new Date();
    attempt.gradedBy = attempt.gradedBy || req.user._id;
    attempt.gradedAt = attempt.gradedAt || new Date();

    await attempt.save();

    // Send in-app notification to student
    await Notification.create({
      recipient: attempt.student,
      title: `Exam Result Published: ${attempt.exam?.title || 'Exam'}`,
      message: `Your exam results are now available. Score: ${attempt.percentage}% (${attempt.isPassed ? 'Passed' : 'Needs Retake'}).`,
      type: 'result_published',
      link: '/student/results',
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'ATTEMPT_PUBLISHED',
      details: { attemptId: attempt._id, student: attempt.student },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Attempt result published to student',
      attempt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch approve and publish all ready attempts for an exam
// @route   PATCH /api/grading/exams/:id/publish-all
// @access  Private (Instructor only)
const publishExamResults = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Find all attempts for this exam that are ready or approved
    const readyAttempts = await ExamAttempt.find({
      exam: exam._id,
      status: { $in: ['submitted', 'auto_submitted', 'graded'] },
      gradingStatus: { $in: ['ready_for_approval', 'approved'] },
    });

    const now = new Date();
    const studentIds = new Set();

    for (const att of readyAttempts) {
      att.gradingStatus = 'published';
      att.isApprovedByInstructor = true;
      att.approvedAt = att.approvedAt || now;
      att.isPublished = true;
      att.publishedAt = now;
      att.gradedBy = att.gradedBy || req.user._id;
      att.gradedAt = att.gradedAt || now;
      await att.save();

      studentIds.add(att.student.toString());
    }

    exam.resultsPublished = true;
    exam.resultsPublishedAt = now;
    await exam.save();

    // Deduplicated student notifications
    const notifications = Array.from(studentIds).map((studentId) => ({
      recipient: studentId,
      title: `Results Published: ${exam.title}`,
      message: `Results for ${exam.title} (${exam.category}) have been published by the instructor.`,
      type: 'result_published',
      link: '/student/results',
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_RESULTS_BATCH_PUBLISHED',
      details: {
        examId: exam._id,
        publishedCount: readyAttempts.length,
        notifiedStudentsCount: notifications.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: `Published ${readyAttempts.length} results for exam "${exam.title}". ${notifications.length} students notified.`,
      publishedCount: readyAttempts.length,
      notifiedStudentsCount: notifications.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send exam reminder notifications to assigned students who have not completed the exam
// @route   POST /api/grading/exams/:id/remind
// @access  Private (Instructor only)
const sendExamReminders = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    if (exam.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send reminders for an exam that is not published',
      });
    }

    const assigned = exam.assignedStudents || [];
    if (assigned.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students are assigned to this exam',
      });
    }

    // Find students with at least 1 completed attempt
    const completedAttempts = await ExamAttempt.find({
      exam: exam._id,
      status: { $in: ['submitted', 'auto_submitted', 'graded'] },
    }).select('student');

    const completedStudentSet = new Set(completedAttempts.map((a) => a.student.toString()));

    const pendingStudentIds = assigned
      .map((id) => id.toString())
      .filter((id) => !completedStudentSet.has(id));

    if (pendingStudentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All assigned students have already completed the exam.',
        remindedCount: 0,
      });
    }

    const reminders = pendingStudentIds.map((studentId) => ({
      recipient: studentId,
      title: `Exam Reminder: ${exam.title}`,
      message: `Reminder: You have a pending exam "${exam.title}" closing on ${new Date(exam.endDate).toLocaleDateString()}. Please complete your attempt on time.`,
      type: 'exam_reminder',
      link: '/student/exams',
    }));

    await Notification.insertMany(reminders);

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_REMINDERS_SENT',
      details: { examId: exam._id, remindedCount: reminders.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: `Sent reminders to ${reminders.length} students with pending submissions.`,
      remindedCount: reminders.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive exam report & question analytics
// @route   GET /api/grading/exams/:id/report
// @access  Private (Instructor only)
const getExamReport = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const attempts = await ExamAttempt.find({
      exam: exam._id,
      status: { $in: ['submitted', 'auto_submitted', 'graded'] },
    }).populate('student', 'name email');

    const assignedCount = exam.assignedStudents?.length || 0;
    const completedCount = attempts.length;
    const passCount = attempts.filter((a) => a.isPassed).length;
    const failCount = completedCount - passCount;
    const passRate = completedCount > 0 ? Math.round((passCount / completedCount) * 100) : 0;

    const percentages = attempts.map((a) => a.percentage);
    percentages.sort((a, b) => a - b);

    const averagePercentage =
      percentages.length > 0
        ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
        : 0;

    const highestScore = percentages.length > 0 ? Math.max(...percentages) : 0;
    const lowestScore = percentages.length > 0 ? Math.min(...percentages) : 0;

    let medianScore = 0;
    if (percentages.length > 0) {
      const mid = Math.floor(percentages.length / 2);
      medianScore =
        percentages.length % 2 !== 0
          ? percentages[mid]
          : Math.round((percentages[mid - 1] + percentages[mid]) / 2);
    }

    // Question-level metrics
    const questionAnalytics = (exam.questionSnapshots || []).map((snap, idx) => {
      const sid = snap._id.toString();
      let answeredCount = 0;
      let correctCount = 0;
      let totalAwarded = 0;

      attempts.forEach((att) => {
        const ans = att.answers.find((a) => a.snapshotId === sid);
        if (ans) {
          answeredCount++;
          if (ans.isCorrect) correctCount++;
          totalAwarded += typeof ans.scoreAwarded === 'number' ? ans.scoreAwarded : 0;
        }
      });

      const successRate =
        answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
      const averageMarksAwarded =
        answeredCount > 0 ? Number((totalAwarded / answeredCount).toFixed(1)) : 0;

      return {
        snapshotId: sid,
        questionIndex: idx + 1,
        code: snap.code,
        topic: snap.topic,
        difficulty: snap.difficulty,
        type: snap.type,
        marks: snap.marks,
        textEn: snap.text?.en || '',
        textAr: snap.text?.ar || '',
        answeredCount,
        correctCount,
        incorrectCount: answeredCount - correctCount,
        successRate,
        averageMarksAwarded,
      };
    });

    res.status(200).json({
      success: true,
      report: {
        exam: {
          _id: exam._id,
          title: exam.title,
          category: exam.category,
          durationMinutes: exam.durationMinutes,
          passingScore: exam.passingScore,
          totalMarks: exam.totalMarks,
          status: exam.status,
          resultsPublished: exam.resultsPublished,
        },
        overview: {
          assignedCount,
          completedCount,
          passCount,
          failCount,
          passRate,
          averagePercentage,
          highestScore,
          lowestScore,
          medianScore,
        },
        questionAnalytics,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttempts,
  getAttemptDetails,
  gradeQuestion,
  approveAttempt,
  publishAttempt,
  publishExamResults,
  sendExamReminders,
  getExamReport,
};
