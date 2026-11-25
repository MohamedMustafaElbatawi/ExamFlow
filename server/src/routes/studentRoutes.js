const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus,
  resetStudentPassword,
  deleteStudent,
} = require('../controllers/studentController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// Protect all routes and enforce instructor role
router.use(protect);
router.use(authorize('instructor'));

router.route('/')
  .get(getStudents)
  .post(createStudent);

router.route('/:id')
  .get(getStudentById)
  .put(updateStudent)
  .delete(deleteStudent);

router.patch('/:id/status', updateStudentStatus);
router.put('/:id/reset-password', resetStudentPassword);

module.exports = router;
