import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { InstructorLayout } from './layouts/InstructorLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { InstructorDashboard } from './pages/instructor/InstructorDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ModulePlaceholder } from './components/ModulePlaceholder';

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
            <Route
              path="students"
              element={
                <ModulePlaceholder
                  title="Student Management"
                  moduleName="Student Directory & Enrolment"
                  phase="Phase 2"
                />
              }
            />
            <Route
              path="questions"
              element={
                <ModulePlaceholder
                  title="Question Bank"
                  moduleName="Bilingual Question Management"
                  phase="Phase 3"
                />
              }
            />
            <Route
              path="import"
              element={
                <ModulePlaceholder
                  title="Import Questions"
                  moduleName="Word & Excel File Parser"
                  phase="Phase 3"
                />
              }
            />
            <Route
              path="exams"
              element={
                <ModulePlaceholder
                  title="Exam Builder"
                  moduleName="Exam Creation & Scheduling"
                  phase="Phase 4"
                />
              }
            />
            <Route
              path="exams/create"
              element={
                <ModulePlaceholder
                  title="Create New Exam"
                  moduleName="Exam Wizard"
                  phase="Phase 4"
                />
              }
            />
            <Route
              path="results"
              element={
                <ModulePlaceholder
                  title="Grading & Results"
                  moduleName="Exam Review & Approval"
                  phase="Phase 5"
                />
              }
            />
            <Route
              path="analytics"
              element={
                <ModulePlaceholder
                  title="Reports & Analytics"
                  moduleName="Performance Metrics"
                  phase="Phase 6"
                />
              }
            />
            <Route
              path="notifications"
              element={
                <ModulePlaceholder
                  title="Notification Center"
                  moduleName="Student Alerts & Broadcasts"
                  phase="Phase 6"
                />
              }
            />
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
            <Route
              path="exams"
              element={
                <ModulePlaceholder
                  title="Available Exams"
                  moduleName="Examination Portal"
                  phase="Phase 4"
                />
              }
            />
            <Route
              path="results"
              element={
                <ModulePlaceholder
                  title="My Results"
                  moduleName="Score History & Review"
                  phase="Phase 5"
                />
              }
            />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
