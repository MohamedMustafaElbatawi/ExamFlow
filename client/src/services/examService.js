import api from './api';

export const examService = {
  getExams: async (params = {}) => {
    const res = await api.get('/exams', { params });
    return res.data;
  },

  getExamById: async (id) => {
    const res = await api.get(`/exams/${id}`);
    return res.data;
  },

  createExam: async (examData) => {
    const res = await api.post('/exams', examData);
    return res.data;
  },

  updateExam: async (id, examData) => {
    const res = await api.put(`/exams/${id}`, examData);
    return res.data;
  },

  publishExam: async (id) => {
    const res = await api.patch(`/exams/${id}/publish`);
    return res.data;
  },

  duplicateExam: async (id) => {
    const res = await api.post(`/exams/${id}/duplicate`);
    return res.data;
  },

  cancelExam: async (id) => {
    const res = await api.patch(`/exams/${id}/cancel`);
    return res.data;
  },

  deleteExam: async (id) => {
    const res = await api.delete(`/exams/${id}`);
    return res.data;
  },

  archiveExam: async (id) => {
    const res = await api.patch(`/exams/${id}/archive`);
    return res.data;
  },

  restoreExam: async (id) => {
    const res = await api.patch(`/exams/${id}/restore`);
    return res.data;
  },
};
