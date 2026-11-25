const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const ActivityLog = require('../models/ActivityLog');
const StudentExamVisibility = require('../models/StudentExamVisibility');

// Fisher-Yates array shuffle helper
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Helper to grade objective answers and assign grading status upon finalization
const gradeAndFinalizeAttempt = (attempt, exam, now, isAuto = false) => {
  attempt.status = isAuto ? 'auto_submitted' : 'submitted';
  attempt.submittedAt = now;

  let totalScore = 0;
  const snapshotMap = {};
  if (exam && exam.questionSnapshots) {
    exam.questionSnapshots.forEach((s) => {
      snapshotMap[s._id.toString()] = s;
    });
  }

  attempt.answers.forEach((ans) => {
    const snap = snapshotMap[ans.snapshotId];
    if (snap) {
      if (['single_choice', 'true_false'].includes(snap.type)) {
        const isCorrect =
          ans.selectedOptions?.length === 1 &&
          snap.correctAnswers.includes(ans.selectedOptions[0]);
        ans.isCorrect = isCorrect;
        ans.scoreAwarded = isCorrect ? snap.marks || 1 : 0;
        totalScore += ans.scoreAwarded;
      } else if (snap.type === 'multiple_choice') {
        // Exact match rule
        const correctSet = new Set(snap.correctAnswers);
        const userSet = new Set(ans.selectedOptions || []);
        const isExactMatch =
          correctSet.size === userSet.size &&
          [...userSet].every((val) => correctSet.has(val));

        ans.isCorrect = isExactMatch;
        ans.scoreAwarded = isExactMatch ? snap.marks || 1 : 0;
        totalScore += ans.scoreAwarded;
      } else if (snap.type === 'essay') {
        ans.isCorrect = false;
        ans.scoreAwarded = 0;
      }
    }
  });

  attempt.totalScore = totalScore;
  const maxScore = exam?.totalMarks || attempt.maxScore || 100;
  attempt.percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  attempt.isPassed = attempt.percentage >= (exam?.passingScore || 70);

  const hasEssayQuestions = exam?.questionSnapshots?.some((s) => s.type === 'essay') || false;
  attempt.gradingStatus = hasEssayQuestions ? 'pending_grading' : 'ready_for_approval';
};

// @desc    Get all available exams for the logged in student
// @route   GET /api/engine/exams
// @access  Private (Student)
const getAvailableExams = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const studentCategory = req.user.category || 'PMP';

    // Find published non-archived exams assigned to this student or open to their category
    const exams = await Exam.find({
      status: 'published',
      isArchived: { $ne: true },
      $or: [
        { assignedStudents: studentId },
        { category: { $in: [studentCategory, 'Both'] } },
      ],
    })
      .select('-questionSnapshots -questions -randomConfig')
      .sort({ startDate: 1 })
      .lean();

    const examIds = exams.map((e) => e._id);

    // Get student visibility states (personal hidden/archived exams)
    const hiddenVisibilities = await StudentExamVisibility.find({
      student: studentId,
      isArchived: true,
    }).lean();
    const hiddenSet = new Set(hiddenVisibilities.map((v) => v.exam.toString()));

    // Get student attempts on these exams
    const attempts = await ExamAttempt.find({
      exam: { $in: examIds },
      student: studentId,
    })
      .select('exam attemptNumber status percentage isPassed submittedAt startedAt examEndTime')
      .sort({ attemptNumber: -1 })
      .lean();

    const attemptsByExam = {};
    attempts.forEach((att) => {
      const eid = att.exam.toString();
      if (!attemptsByExam[eid]) attemptsByExam[eid] = [];
      attemptsByExam[eid].push(att);
    });

    const now = new Date();

    const examsWithStatus = await Promise.all(
      exams.map(async (exam) => {
        const eid = exam._id.toString();
        const examAttempts = attemptsByExam[eid] || [];

        // Check and auto-finalize any in_progress attempt that has expired
        for (const att of examAttempts) {
          if (
            att.status === 'in_progress' &&
            att.examEndTime &&
            now > new Date(new Date(att.examEndTime).getTime() + 60000)
          ) {
            const fullAttempt = await ExamAttempt.findById(att._id);
            if (fullAttempt && fullAttempt.status === 'in_progress') {
              const fullExam = await Exam.findById(exam._id);
              gradeAndFinalizeAttempt(fullAttempt, fullExam, now, true);
              await fullAttempt.save();
              att.status = 'auto_submitted';
              att.submittedAt = now;
              att.percentage = fullAttempt.percentage;
              att.isPassed = fullAttempt.isPassed;
            }
          }
        }

        const completedAttempts = examAttempts.filter((a) =>
          ['submitted', 'auto_submitted', 'graded'].includes(a.status)
        );
        const inProgressAttempt = examAttempts.find((a) => a.status === 'in_progress');

        const isStarted = now >= new Date(exam.startDate);
        const isEnded = now > new Date(exam.endDate);
        const remainingAttempts = Math.max(0, exam.maxAttempts - completedAttempts.length);

        let canStart = false;
        let statusLabel = 'upcoming'; // upcoming | open | completed | expired

        if (!isStarted) {
          statusLabel = 'upcoming';
        } else if (isEnded) {
          statusLabel = 'expired';
        } else if (inProgressAttempt) {
          statusLabel = 'in_progress';
          canStart = true;
        } else if (remainingAttempts > 0) {
          statusLabel = 'open';
          canStart = true;
        } else {
          statusLabel = 'completed';
        }

        const isStudentArchived = hiddenSet.has(eid);
        const canViewScore = (exam.showResultsImmediately || exam.resultsPublished) && completedAttempts.length > 0;

        return {
          _id: exam._id,
          title: exam.title,
          description: exam.description,
          category: exam.category,
          durationMinutes: exam.durationMinutes,
          passingScore: exam.passingScore,
          maxAttempts: exam.maxAttempts,
          startDate: exam.startDate,
          endDate: exam.endDate,
          showResultsImmediately: exam.showResultsImmediately,
          allowReviewAnswers: exam.allowReviewAnswers,
          resultsPublished: exam.resultsPublished,
          attemptsCount: completedAttempts.length,
          remainingAttempts,
          statusLabel,
          canStart: !isStudentArchived && canStart,
          isStudentArchived,
          activeAttemptId: inProgressAttempt?._id || null,
          recentScore: canViewScore ? completedAttempts[0]?.percentage ?? null : null,
          isPassed: canViewScore ? completedAttempts.some((a) => a.isPassed) : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: examsWithStatus.length,
      exams: examsWithStatus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam instructions and details prior to starting
// @route   GET /api/engine/exams/:id/instructions
// @access  Private (Student)
const getExamInstructions = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      status: 'published',
    }).select('-questionSnapshots -questions -randomConfig');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam session not found or is not currently published',
      });
    }

    const now = new Date();

    let activeAttempt = await ExamAttempt.findOne({
      exam: exam._id,
      student: req.user._id,
      status: 'in_progress',
    });

    if (
      activeAttempt &&
      activeAttempt.examEndTime &&
      now > new Date(activeAttempt.examEndTime.getTime() + 60000)
    ) {
      const fullExam = await Exam.findById(exam._id);
      gradeAndFinalizeAttempt(activeAttempt, fullExam, now, true);
      await activeAttempt.save();
      activeAttempt = null;
    }

    const completedAttemptsCount = await ExamAttempt.countDocuments({
      exam: exam._id,
      student: req.user._id,
      status: { $in: ['submitted', 'auto_submitted', 'graded'] },
    });

    const isStarted = now >= new Date(exam.startDate);
    const isEnded = now > new Date(exam.endDate);
    const remainingAttempts = Math.max(0, exam.maxAttempts - completedAttemptsCount);

    res.status(200).json({
      success: true,
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        category: exam.category,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passingScore: exam.passingScore,
        maxAttempts: exam.maxAttempts,
        startDate: exam.startDate,
        endDate: exam.endDate,
        allowBackwardNavigation: exam.allowBackwardNavigation,
        shuffleQuestions: exam.shuffleQuestions,
      },
      timing: {
        isStarted,
        isEnded,
        canAttempt: (isStarted && !isEnded && remainingAttempts > 0) || !!activeAttempt,
        completedAttemptsCount,
        remainingAttempts,
        activeAttempt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start new attempt or resume active in-progress attempt
// @route   POST /api/engine/exams/:id/start
// @access  Private (Student)
const startOrResumeAttempt = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.status !== 'published') {
      return res.status(404).json({
        success: false,
        message: 'Exam session is not available or has been unpublished',
      });
    }

    const now = new Date();

    // 1. Check Availability Window
    if (now < new Date(exam.startDate)) {
      return res.status(400).json({
        success: false,
        message: `This exam is not available yet. It opens on ${new Date(exam.startDate).toLocaleString()}.`,
      });
    }

    if (now > new Date(exam.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'This exam window has closed.',
      });
    }

    // 2. Check for active in-progress attempt to RESUME
    let attempt = await ExamAttempt.findOne({
      exam: exam._id,
      student: req.user._id,
      status: 'in_progress',
    });

    if (attempt) {
      // Check if time has expired (with 60-second grace period)
      if (attempt.examEndTime && now > new Date(attempt.examEndTime.getTime() + 60000)) {
        // Auto-finalize expired attempt with grading
        gradeAndFinalizeAttempt(attempt, exam, now, true);
        await attempt.save();
        attempt = null; // Proceed to attempt limit check
      }
    }

    // 3. If no active attempt, create a new one safely
    if (!attempt) {
      const completedCount = await ExamAttempt.countDocuments({
        exam: exam._id,
        student: req.user._id,
        status: { $in: ['submitted', 'auto_submitted', 'graded'] },
      });

      if (completedCount >= exam.maxAttempts) {
        return res.status(400).json({
          success: false,
          message: `You have reached the maximum allowed attempts (${exam.maxAttempts}) for this exam.`,
        });
      }

      // Determine highest existing attempt number for this student and exam
      const latestAttempt = await ExamAttempt.findOne({
        exam: exam._id,
        student: req.user._id,
      }).sort({ attemptNumber: -1 });

      const nextAttemptNumber = Math.max(
        completedCount + 1,
        (latestAttempt?.attemptNumber || 0) + 1
      );

      // Generate question order (shuffled or sequential)
      let snapshotIds = exam.questionSnapshots.map((s) => s._id.toString());
      if (exam.shuffleQuestions) {
        snapshotIds = shuffleArray(snapshotIds);
      }

      // Generate options order map if shuffleOptions is enabled
      const optionsOrderMap = {};
      exam.questionSnapshots.forEach((s) => {
        const optIds = s.options.map((o) => o.id);
        optionsOrderMap[s._id.toString()] = exam.shuffleOptions ? shuffleArray(optIds) : optIds;
      });

      const examEndTime = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);

      try {
        attempt = await ExamAttempt.create({
          exam: exam._id,
          student: req.user._id,
          attemptNumber: nextAttemptNumber,
          startedAt: now,
          examEndTime,
          status: 'in_progress',
          questionOrder: snapshotIds,
          optionsOrderMap,
          answers: [],
          maxScore: exam.totalMarks || 100,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || '',
        });

        await ActivityLog.create({
          user: req.user._id,
          action: 'EXAM_ATTEMPT_STARTED',
          details: { examId: exam._id, attemptId: attempt._id, attemptNumber: attempt.attemptNumber },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || '',
        });
      } catch (createErr) {
        // Race condition recovery: If concurrent requests tried to create the attempt simultaneously,
        // duplicate key (11000) is caught and we gracefully retrieve and resume the active attempt!
        if (createErr.code === 11000) {
          console.warn(`[startOrResumeAttempt] Race condition duplicate key caught for student ${req.user._id} on exam ${exam._id}. Resuming active attempt...`);
          attempt = await ExamAttempt.findOne({
            exam: exam._id,
            student: req.user._id,
            status: 'in_progress',
          });

          if (!attempt) {
            const finalized = await ExamAttempt.findOne({
              exam: exam._id,
              student: req.user._id,
              status: { $in: ['submitted', 'auto_submitted', 'graded'] },
            }).sort({ attemptNumber: -1 });

            if (finalized) {
              return res.status(400).json({
                success: false,
                message: 'This examination attempt has already been submitted.',
              });
            }
            throw createErr;
          }
        } else {
          throw createErr;
        }
      }
    }

    // 4. Build sanitized questions array (SECURITY: OMIT correctAnswers & explanation!)
    const snapshotMap = {};
    exam.questionSnapshots.forEach((s) => {
      snapshotMap[s._id.toString()] = s;
    });

    const sanitizedQuestions = attempt.questionOrder
      .map((sid) => {
        const s = snapshotMap[sid];
        if (!s) return null;

        const orderedOptIds = attempt.optionsOrderMap.get(sid) || s.options.map((o) => o.id);
        const optMap = {};
        s.options.forEach((o) => {
          optMap[o.id] = o;
        });

        const orderedOptions = orderedOptIds
          .map((oid) => optMap[oid])
          .filter(Boolean)
          .map((o) => ({
            id: o.id,
            text: { en: o.text?.en || '', ar: o.text?.ar || '' },
          }));

        return {
          snapshotId: s._id.toString(),
          code: s.code,
          category: s.category,
          topic: s.topic,
          difficulty: s.difficulty,
          type: s.type,
          text: { en: s.text?.en || '', ar: s.text?.ar || '' },
          options: orderedOptions,
          marks: s.marks,
          image: s.image,
        };
      })
      .filter(Boolean);

    // Existing saved answers map
    const savedAnswers = {};
    attempt.answers.forEach((ans) => {
      savedAnswers[ans.snapshotId] = {
        selectedOptions: ans.selectedOptions || [],
        textAnswer: ans.textAnswer || '',
        answeredAt: ans.answeredAt,
      };
    });

    const remainingSeconds = Math.max(0, Math.floor((attempt.examEndTime - now) / 1000));

    res.status(200).json({
      success: true,
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        examEndTime: attempt.examEndTime,
        remainingSeconds,
        currentQuestionIndex: attempt.currentQuestionIndex || 0,
        savedAnswers,
      },
      examSettings: {
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        allowBackwardNavigation: exam.allowBackwardNavigation,
        totalQuestions: sanitizedQuestions.length,
        totalMarks: exam.totalMarks,
      },
      questions: sanitizedQuestions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Autosave answer heartbeat continuously
// @route   PATCH /api/engine/attempts/:id/answer
// @access  Private (Student)
const saveAnswer = async (req, res, next) => {
  try {
    const { snapshotId, selectedOptions = [], textAnswer = '', currentQuestionIndex = 0 } = req.body;

    const attempt = await ExamAttempt.findOne({
      _id: req.params.id,
      student: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    const now = new Date();

    // Check if attempt is already finalized
    if (['submitted', 'auto_submitted', 'graded'].includes(attempt.status)) {
      return res.status(400).json({
        success: false,
        message: 'Attempt has already been submitted',
        isSubmitted: true,
      });
    }

    // Check timer expiration with 60s grace period
    if (now > new Date(attempt.examEndTime.getTime() + 60000)) {
      const exam = await Exam.findById(attempt.exam);
      gradeAndFinalizeAttempt(attempt, exam, now, true);
      await attempt.save();

      return res.status(400).json({
        success: false,
        message: 'Exam duration has expired. Attempt automatically submitted.',
        isExpired: true,
      });
    }

    // Update or insert answer in answers array
    const existingIndex = attempt.answers.findIndex((a) => a.snapshotId === snapshotId);
    if (existingIndex > -1) {
      attempt.answers[existingIndex].selectedOptions = selectedOptions;
      attempt.answers[existingIndex].textAnswer = textAnswer;
      attempt.answers[existingIndex].answeredAt = now;
    } else {
      attempt.answers.push({
        snapshotId,
        selectedOptions,
        textAnswer,
        answeredAt: now,
      });
    }

    attempt.currentQuestionIndex = currentQuestionIndex;
    attempt.lastHeartbeatAt = now;
    await attempt.save();

    const remainingSeconds = Math.max(0, Math.floor((attempt.examEndTime - now) / 1000));

    res.status(200).json({
      success: true,
      savedAt: now,
      remainingSeconds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit exam attempt (Idempotent)
// @route   POST /api/engine/attempts/:id/submit
// @access  Private (Student)
const submitAttempt = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findOne({
      _id: req.params.id,
      student: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    // IDEMPOTENCY: If already submitted, return receipt without error
    if (['submitted', 'auto_submitted', 'graded'].includes(attempt.status)) {
      return res.status(200).json({
        success: true,
        alreadySubmitted: true,
        message: 'Attempt was already submitted',
        receipt: {
          attemptId: attempt._id,
          attemptNumber: attempt.attemptNumber,
          submittedAt: attempt.submittedAt,
          status: attempt.status,
          gradingStatus: attempt.gradingStatus,
          totalScore: attempt.totalScore,
          percentage: attempt.percentage,
          isPassed: attempt.isPassed,
        },
      });
    }

    const exam = await Exam.findById(attempt.exam);
    const now = new Date();

    // Determine status (submitted vs auto_submitted) and grade attempt
    const isAuto = now > new Date(attempt.examEndTime.getTime() + 60000);
    gradeAndFinalizeAttempt(attempt, exam, now, isAuto);
    await attempt.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'EXAM_ATTEMPT_SUBMITTED',
      details: {
        examId: attempt.exam,
        attemptId: attempt._id,
        attemptNumber: attempt.attemptNumber,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        gradingStatus: attempt.gradingStatus,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    const showImmediate = Boolean(exam?.showResultsImmediately && attempt.gradingStatus !== 'pending_grading');

    const receipt = {
      attemptId: attempt._id,
      attemptNumber: attempt.attemptNumber,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      gradingStatus: attempt.gradingStatus,
      showResultsImmediately: showImmediate,
      percentage: showImmediate ? attempt.percentage : null,
      totalScore: showImmediate ? attempt.totalScore : null,
      maxScore: showImmediate ? attempt.maxScore : null,
      isPassed: showImmediate ? attempt.isPassed : null,
    };

    res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      receipt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get published results for logged-in student
// @route   GET /api/engine/results
// @access  Private (Student)
const getStudentResults = async (req, res, next) => {
  try {
    const attempts = await ExamAttempt.find({
      student: req.user._id,
      status: { $in: ['submitted', 'auto_submitted', 'graded'] },
      gradingStatus: 'published',
    })
      .populate('exam', 'title description category durationMinutes passingScore totalMarks allowReviewAnswers')
      .sort({ publishedAt: -1, submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: attempts.length,
      results: attempts.map((att) => {
        let correctCount = 0;
        let incorrectCount = 0;
        let essayCount = 0;
        let essayGradedCount = 0;

        (att.answers || []).forEach((ans) => {
          if (ans.isCorrect) {
            correctCount++;
          } else if (ans.scoreAwarded === 0 && ans.selectedOptions?.length > 0) {
            incorrectCount++;
          }
          if (ans.textAnswer && ans.textAnswer.trim() !== '') {
            essayCount++;
            if (typeof ans.scoreAwarded === 'number' && ans.gradedAt) {
              essayGradedCount++;
            }
          }
        });

        return {
          _id: att._id,
          exam: att.exam,
          attemptNumber: att.attemptNumber,
          submittedAt: att.submittedAt,
          publishedAt: att.publishedAt,
          totalScore: att.totalScore,
          maxScore: att.maxScore,
          percentage: att.percentage,
          isPassed: att.isPassed,
          instructorFeedback: att.instructorFeedback,
          allowReviewAnswers: att.exam?.allowReviewAnswers || false,
          correctAnswersCount: correctCount,
          incorrectAnswersCount: incorrectCount,
          essayQuestionsCount: essayCount,
          essayGradedCount: essayGradedCount,
          essayGradingStatus: att.gradingStatus,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Hide/Archive an exam for the logged-in student (personal list only)
// @route   POST /api/engine/exams/:id/hide
// @access  Private (Student)
const hideStudentExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Security check: cannot hide if student has an active unfinished attempt
    const activeAttempt = await ExamAttempt.findOne({
      exam: exam._id,
      student: req.user._id,
      status: 'in_progress',
    });

    if (activeAttempt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot archive or hide an exam with an active unfinished attempt. Please complete or submit the attempt first.',
      });
    }

    await StudentExamVisibility.findOneAndUpdate(
      { student: req.user._id, exam: exam._id },
      { isArchived: true, archivedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Exam archived from your list successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore a hidden/archived exam for the logged-in student
// @route   POST /api/engine/exams/:id/restore
// @access  Private (Student)
const restoreStudentExam = async (req, res, next) => {
  try {
    await StudentExamVisibility.findOneAndUpdate(
      { student: req.user._id, exam: req.params.id },
      { isArchived: false, archivedAt: null },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Exam restored to your list successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed published result with question review (if permitted)
// @route   GET /api/engine/results/:id
// @access  Private (Student)
const getStudentResultDetails = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findOne({
      _id: req.params.id,
      student: req.user._id,
    }).populate('exam');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt result not found',
      });
    }

    if (attempt.gradingStatus !== 'published') {
      return res.status(403).json({
        success: false,
        message: 'This exam result is pending instructor review and has not been published yet.',
      });
    }

    const exam = attempt.exam;
    const allowReview = exam ? exam.allowReviewAnswers : false;

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

    const questionsReview = questionOrder
      .map((sid, idx) => {
        const snap = snapshotMap[sid];
        if (!snap) return null;
        const ans = answersMap[sid] || {};

        const baseInfo = {
          snapshotId: sid,
          questionIndex: idx + 1,
          type: snap.type,
          text: snap.text,
          marks: snap.marks,
          studentAnswer: {
            selectedOptions: ans.selectedOptions || [],
            textAnswer: ans.textAnswer || '',
            scoreAwarded: ans.scoreAwarded || 0,
            isCorrect: ans.isCorrect || false,
            feedback: ans.feedback || '',
          },
        };

        if (allowReview) {
          baseInfo.options = snap.options;
          baseInfo.correctAnswers = snap.correctAnswers;
          baseInfo.explanation = snap.explanation;
        }

        return baseInfo;
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      result: {
        _id: attempt._id,
        exam: {
          _id: exam?._id,
          title: exam?.title,
          category: exam?.category,
          passingScore: exam?.passingScore,
          allowReviewAnswers: allowReview,
        },
        attemptNumber: attempt.attemptNumber,
        submittedAt: attempt.submittedAt,
        publishedAt: attempt.publishedAt,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        instructorFeedback: attempt.instructorFeedback,
        questionsReview,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableExams,
  getExamInstructions,
  startOrResumeAttempt,
  saveAnswer,
  submitAttempt,
  getStudentResults,
  getStudentResultDetails,
  hideStudentExam,
  restoreStudentExam,
};
