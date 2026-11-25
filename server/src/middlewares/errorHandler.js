const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('[Request Error]', {
    method: req.method,
    path: req.path,
    name: err.name,
    code: err.code,
    statusCode: err.statusCode,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return res.status(404).json({ success: false, message });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    if (field === 'exam' || err.message?.includes('exam_1_student_1_attemptNumber_1')) {
      const message = 'An attempt for this exam is already in progress or has been registered. Please resume your active attempt.';
      return res.status(400).json({ success: false, message });
    }
    const message = `Duplicate value entered for ${field}. Please use another value.`;
    return res.status(400).json({ success: false, message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({ success: false, message });
  }

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Server Internal Error'
      : error.message || 'Server Internal Error',
  });
};

module.exports = errorHandler;
