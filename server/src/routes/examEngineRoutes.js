const express = require('express');
const router = express.Router();
const {
  getAvailableExams,
  getExamInstructions,
  startOrResumeAttempt,
  saveAnswer,
  submitAttempt,
  getStudentResults,
  getStudentResultDetails,
  hideStudentExam,
  restoreStudentExam,
} = require('../controllers/examEngineController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// Protect all routes and enforce student role
router.use(protect);
router.use(authorize('student'));

router.get('/exams', getAvailableExams);
router.get('/exams/:id/instructions', getExamInstructions);
router.post('/exams/:id/start', startOrResumeAttempt);
router.post('/exams/:id/hide', hideStudentExam);
router.post('/exams/:id/restore', restoreStudentExam);
router.patch('/attempts/:id/answer', saveAnswer);
router.post('/attempts/:id/submit', submitAttempt);
router.get('/results', getStudentResults);
router.get('/results/:id', getStudentResultDetails);

module.exports = router;
