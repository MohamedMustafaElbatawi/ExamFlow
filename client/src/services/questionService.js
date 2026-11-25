import api from './api';

export const questionService = {
  getQuestions: async (params = {}) => {
    const res = await api.get('/questions', { params });
    return res.data;
  },

  getQuestionById: async (id) => {
    const res = await api.get(`/questions/${id}`);
    return res.data;
  },

  createQuestion: async (questionData) => {
    const res = await api.post('/questions', questionData);
    return res.data;
  },

  updateQuestion: async (id, questionData) => {
    const res = await api.put(`/questions/${id}`, questionData);
    return res.data;
  },

  toggleArchive: async (id) => {
    const res = await api.patch(`/questions/${id}/archive`);
    return res.data;
  },

  bulkArchive: async (ids) => {
    const res = await api.post('/questions/bulk-archive', { ids });
    return res.data;
  },

  deleteQuestion: async (id) => {
    const res = await api.delete(`/questions/${id}`);
    return res.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/questions/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getTopics: async (category = '') => {
    const res = await api.get('/questions/topics', { params: { category } });
    return res.data;
  },

  getStats: async () => {
    const res = await api.get('/questions/stats');
    return res.data;
  },
};
