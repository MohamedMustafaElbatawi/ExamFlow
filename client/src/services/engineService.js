import api from './api';

export const engineService = {
  getAvailableExams: async () => {
    const res = await api.get('/engine/exams');
    return res.data;
  },

  getExamInstructions: async (id) => {
    const res = await api.get(`/engine/exams/${id}/instructions`);
    return res.data;
  },

  startOrResumeAttempt: async (id) => {
    const res = await api.post(`/engine/exams/${id}/start`);
    return res.data;
  },

  saveAnswer: async (attemptId, answerData) => {
    const res = await api.patch(`/engine/attempts/${attemptId}/answer`, answerData);
    return res.data;
  },

  submitAttempt: async (attemptId) => {
    const res = await api.post(`/engine/attempts/${attemptId}/submit`);
    return res.data;
  },

  getStudentResults: async () => {
    const res = await api.get('/engine/results');
    return res.data;
  },

  getStudentResultDetails: async (attemptId) => {
    const res = await api.get(`/engine/results/${attemptId}`);
    return res.data;
  },

  hideExam: async (id) => {
    const res = await api.post(`/engine/exams/${id}/hide`);
    return res.data;
  },

  restoreExam: async (id) => {
    const res = await api.post(`/engine/exams/${id}/restore`);
    return res.data;
  },
};
