const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ExamFlow API Server',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api', (req, res, next) => {
  const missing = [];
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.CLIENT_URL) missing.push('CLIENT_URL');
  }

  if (missing.length) {
    console.error('[Configuration] Missing required environment variables', { names: missing });
    const error = new Error('Server configuration is incomplete.');
    error.statusCode = 500;
    return next(error);
  }

  return connectDB().then(() => next()).catch(next);
});

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/students', require('./src/routes/studentRoutes'));
app.use('/api/questions', require('./src/routes/questionRoutes'));
app.use('/api/import', require('./src/routes/importRoutes'));
app.use('/api/exams', require('./src/routes/examRoutes'));
app.use('/api/engine', require('./src/routes/examEngineRoutes'));
app.use('/api/grading', require('./src/routes/gradingRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));

// Global Error Handler
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[ExamFlow API] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', { name: err.name, code: err.code });
});
