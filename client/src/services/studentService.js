import api from './api';

export const studentService = {
  // Get all students with optional search, category, status, and pagination
  getStudents: async (params = {}) => {
    const res = await api.get('/students', { params });
    return res.data;
  },

  // Get single student details with exam history and performance
  getStudentById: async (id) => {
    const res = await api.get(`/students/${id}`);
    return res.data;
  },

  // Create new student
  createStudent: async (studentData) => {
    const res = await api.post('/students', studentData);
    return res.data;
  },

  // Update student profile
  updateStudent: async (id, studentData) => {
    const res = await api.put(`/students/${id}`, studentData);
    return res.data;
  },

  // Toggle student status (active / suspended)
  updateStatus: async (id, status) => {
    const res = await api.patch(`/students/${id}/status`, { status });
    return res.data;
  },

  // Reset student password
  resetPassword: async (id, newPassword) => {
    const res = await api.put(`/students/${id}/reset-password`, { newPassword });
    return res.data;
  },

  // Soft delete / deactivate student
  deleteStudent: async (id) => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  },
};
