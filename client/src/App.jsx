import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { InstructorLayout } from './layouts/InstructorLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { InstructorDashboard } from './pages/instructor/InstructorDashboard';
import { StudentManagement } from './pages/instructor/StudentManagement';
import { QuestionBank } from './pages/instructor/QuestionBank';
import { ImportQuestions } from './pages/instructor/ImportQuestions';
import { ExamList } from './pages/instructor/ExamList';
import { ExamBuilder } from './pages/instructor/ExamBuilder';
import { ExamResults } from './pages/instructor/ExamResults';
import { InstructorAnalytics } from './pages/instructor/InstructorAnalytics';
import { InstructorNotifications } from './pages/instructor/InstructorNotifications';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AvailableExams } from './pages/student/AvailableExams';
import { ExamInstructions } from './pages/student/ExamInstructions';
import { ActiveExam } from './pages/student/ActiveExam';
import { StudentResults } from './pages/student/StudentResults';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Instructor Protected Routes */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <InstructorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InstructorDashboard />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="questions" element={<QuestionBank />} />
            <Route path="import" element={<ImportQuestions />} />
            <Route path="exams" element={<ExamList />} />
            <Route path="exams/create" element={<ExamBuilder />} />
            <Route path="exams/edit/:id" element={<ExamBuilder />} />
            <Route path="results" element={<ExamResults />} />
            <Route path="analytics" element={<InstructorAnalytics />} />
            <Route path="notifications" element={<InstructorNotifications />} />
          </Route>

          {/* Student Protected Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="exams" element={<AvailableExams />} />
            <Route path="exam/:id/instructions" element={<ExamInstructions />} />
            <Route path="results" element={<StudentResults />} />
          </Route>

          {/* Dedicated Full-Screen Live Exam Room */}
          <Route
            path="/student/exam/:id/live"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ActiveExam />
              </ProtectedRoute>
            }
          />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
