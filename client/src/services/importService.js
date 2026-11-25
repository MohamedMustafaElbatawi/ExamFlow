import api from './api';

export const importService = {
  previewImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  confirmImport: async (questions) => {
    const res = await api.post('/import/confirm', { questions });
    return res.data;
  },

  getTemplateGuide: async () => {
    const res = await api.get('/import/template-guide');
    return res.data;
  },
};
