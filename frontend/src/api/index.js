import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 学生相关
export const getStudents = () => api.get('/students/');
export const getStudent = (id) => api.get(`/students/${id}`);
export const searchStudents = (params) => api.get('/students/search', { params });

// 教师相关
export const getTeachers = () => api.get('/teachers/');
export const searchTeachers = (params) => api.get('/teachers/search', { params });
export const getTeacherClasses = (id) => api.get(`/teachers/${id}/classes`);

// 成绩相关
export const getScoreTrend = (id) => api.get(`/scores/trend/${id}`);
export const getOverview = () => api.get('/scores/overview');
export const getScoreDistribution = (params) => api.get('/scores/distribution', { params });
export const getClassStats = (params) => api.get('/scores/class-stats', { params });

// NL2SQL
export const nl2sqlQuery = (question) => api.post('/nl2sql/query', { question });

// 预警相关
export const getAlerts = (params) => api.get('/alerts/', { params });
export const generateAlerts = () => api.post('/alerts/generate');
export const updateIntervention = (id, data) => api.put(`/alerts/${id}/intervene`, data);
export const getAlertStats = () => api.get('/alerts/stats');

// 建议相关
export const getSuggestions = (id) => api.get(`/suggestions/${id}`);
export const generateSuggestion = (id) => api.post(`/suggestions/generate/${id}`);
export const updateSuggestionFeedback = (id, data) => api.put(`/suggestions/${id}/feedback`, data);

export default api;
