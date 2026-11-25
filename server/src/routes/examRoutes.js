const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/examController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// Protect all routes and enforce instructor role
router.use(protect);
router.use(authorize('instructor'));

router.route('/')
  .get(getExams)
  .post(createExam);

router.route('/:id')
  .get(getExamById)
  .put(updateExam)
  .delete(deleteExam);

router.patch('/:id/publish', publishExam);
router.patch('/:id/cancel', cancelExam);
router.patch('/:id/archive', archiveExam);
router.patch('/:id/restore', restoreExam);
router.post('/:id/duplicate', duplicateExam);

module.exports = router;
