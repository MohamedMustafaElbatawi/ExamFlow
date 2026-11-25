const User = require('../models/User');
const ExamAttempt = require('../models/ExamAttempt');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get all students with filters, search, and pagination
// @route   GET /api/students
// @access  Private (Instructor only)
const getStudents = async (req, res, next) => {
  try {
    const {
      search,
      category,
      status,
      includeDeleted,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = { role: 'student' };

    // Soft deletion filter
    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search by name, email, or phone
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    const sortDirection = order === 'asc' ? 1 : -1;

    const [total, students] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    // Attach attempt count for each student
    const studentIds = students.map((s) => s._id);
    const attemptCounts = await ExamAttempt.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $group: { _id: '$student', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    attemptCounts.forEach((ac) => {
      countMap[ac._id.toString()] = ac.count;
    });

    const studentsWithStats = students.map((s) => ({
      ...s,
      attemptCount: countMap[s._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      count: studentsWithStats.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      students: studentsWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single student details with exam history & performance summary
// @route   GET /api/students/:id
// @access  Private (Instructor only)
const getStudentById = async (req, res, next) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: 'student',
    }).select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Retrieve historical exam attempts
    const attempts = await ExamAttempt.find({ student: student._id })
      .populate('exam', 'title category durationMinutes passingScore')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate performance summary
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter((a) =>
      ['submitted', 'auto_submitted', 'graded'].includes(a.status)
    );
    const passedCount = completedAttempts.filter((a) => a.isPassed).length;
    const averageScore =
      completedAttempts.length > 0
        ? Math.round(
            completedAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
              completedAttempts.length
          )
        : 0;

    res.status(200).json({
      success: true,
      student,
      performanceSummary: {
        totalAttempts,
        completedAttempts: completedAttempts.length,
        passedCount,
        failedCount: completedAttempts.length - passedCount,
        averageScore,
      },
      attempts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Instructor only)
const createStudent = async (req, res, next) => {
  try {
    const { name, email, phone, category = 'PMP', password, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required fields',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
    }

    const defaultPassword = password && password.trim().length >= 6 ? password : 'Password123!';

    const student = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      category: ['PMP', 'MPA', 'Both'].includes(category) ? category : 'PMP',
      password: defaultPassword,
      role: 'student',
      status: 'active',
      notes: notes || '',
      mustChangePassword: !password, // if default password used, require change
    });

    // Log action
    await ActivityLog.create({
      user: req.user._id,
      action: 'STUDENT_CREATED',
      details: { studentId: student._id, email: student.email, name: student.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    const sanitizedStudent = await User.findById(student._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      student: sanitizedStudent,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update student profile
// @route   PUT /api/students/:id
// @access  Private (Instructor only)
const updateStudent = async (req, res, next) => {
  try {
    const { name, email, phone, category, notes, status } = req.body;

    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (email && email.toLowerCase().trim() !== student.email) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: cleanEmail, _id: { $ne: student._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another user with this email already exists',
        });
      }
      student.email = cleanEmail;
    }

    if (name) student.name = name.trim();
    if (phone !== undefined) student.phone = phone.trim();
    if (category && ['PMP', 'MPA', 'Both'].includes(category)) student.category = category;
    if (notes !== undefined) student.notes = notes;
    if (status && ['active', 'suspended', 'deactivated'].includes(status)) student.status = status;

    await student.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'STUDENT_UPDATED',
      details: { studentId: student._id, changes: req.body },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    const updated = await User.findById(student._id).select('-password');

    res.status(200).json({
      success: true,
      message: 'Student profile updated successfully',
      student: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle student status (Active / Suspended)
// @route   PATCH /api/students/:id/status
// @access  Private (Instructor only)
const updateStudentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either active or suspended',
      });
    }

    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    student.status = status;
    await student.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'STUDENT_STATUS_CHANGED',
      details: { studentId: student._id, newStatus: status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: `Student status updated to ${status}`,
      status: student.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset student password by instructor
// @route   PUT /api/students/:id/reset-password
// @access  Private (Instructor only)
const resetStudentPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('+password');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    student.password = newPassword;
    student.mustChangePassword = true;
    await student.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'STUDENT_PASSWORD_RESET',
      details: { studentId: student._id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Student will be prompted to change password upon next login.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete / Deactivate student (never delete exam attempts)
// @route   DELETE /api/students/:id
// @access  Private (Instructor only)
const deleteStudent = async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Perform soft deletion
    student.isDeleted = true;
    student.deletedAt = new Date();
    student.status = 'deactivated';
    await student.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'STUDENT_DEACTIVATED',
      details: { studentId: student._id, email: student.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Student deactivated successfully (soft-deleted). Historical exam attempts and results remain preserved.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus,
  resetStudentPassword,
  deleteStudent,
};
