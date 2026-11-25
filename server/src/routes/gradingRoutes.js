const express = require('express');
const router = express.Router();
const {
  getAttempts,
  getAttemptDetails,
  gradeQuestion,
  approveAttempt,
  publishAttempt,
  publishExamResults,
  sendExamReminders,
  getExamReport,
} = require('../controllers/gradingController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// All grading routes are protected and instructor-only
router.use(protect);
router.use(authorize('instructor'));

router.get('/attempts', getAttempts);
router.get('/attempts/:id', getAttemptDetails);
router.patch('/attempts/:id/grade-question', gradeQuestion);
router.patch('/attempts/:id/approve', approveAttempt);
router.patch('/attempts/:id/publish', publishAttempt);
router.patch('/exams/:id/publish-all', publishExamResults);
router.post('/exams/:id/remind', sendExamReminders);
router.get('/exams/:id/report', getExamReport);

module.exports = router;
