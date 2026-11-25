const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/questionController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { uploadQuestionImage } = require('../middlewares/uploadMiddleware');

// Protect all question bank endpoints and enforce instructor role
router.use(protect);
router.use(authorize('instructor'));

router.get('/topics', getTopics);
router.get('/stats', getStats);
router.post('/bulk-archive', bulkArchive);
router.post('/upload-image', uploadQuestionImage.single('image'), uploadQuestionImageHandler);

router.route('/')
  .get(getQuestions)
  .post(createQuestion);

router.route('/:id')
  .get(getQuestionById)
  .put(updateQuestion)
  .delete(deleteQuestion);

router.patch('/:id/archive', toggleArchive);

module.exports = router;
