import api from './api';

export const gradingService = {
  getAttempts: async (params = {}) => {
    const res = await api.get('/grading/attempts', { params });
    return res.data;
  },

  getAttemptDetails: async (id) => {
    const res = await api.get(`/grading/attempts/${id}`);
    return res.data;
  },

  gradeQuestion: async (attemptId, data) => {
    const res = await api.patch(`/grading/attempts/${attemptId}/grade-question`, data);
    return res.data;
  },

  approveAttempt: async (attemptId, data = {}) => {
    const res = await api.patch(`/grading/attempts/${attemptId}/approve`, data);
    return res.data;
  },

  publishAttempt: async (attemptId) => {
    const res = await api.patch(`/grading/attempts/${attemptId}/publish`);
    return res.data;
  },

  publishExamResults: async (examId) => {
    const res = await api.patch(`/grading/exams/${examId}/publish-all`);
    return res.data;
  },

  sendExamReminders: async (examId) => {
    const res = await api.post(`/grading/exams/${examId}/remind`);
    return res.data;
  },

  getExamReport: async (examId) => {
    const res = await api.get(`/grading/exams/${examId}/report`);
    return res.data;
  },
};
