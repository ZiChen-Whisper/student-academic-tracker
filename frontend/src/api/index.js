import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 学生相关
export const getStudents = (params) => api.get('/students/', { params });
export const getStudent = (id) => api.get(`/students/${id}`);
export const searchStudents = (params) => api.get('/students/search', { params });

// 教师相关
export const getTeachers = () => api.get('/teachers/');
export const searchTeachers = (params) => api.get('/teachers/search', { params });
export const getTeacherClasses = (id) => api.get(`/teachers/${id}/classes`);

// 成绩相关
export const getScoreTrend = (id) => api.get(`/scores/trend/${id}`);
export const getOverview = (params) => api.get('/scores/overview', { params });
export const getScoreDistribution = (params) => api.get('/scores/distribution', { params });
export const getClassStats = (params) => api.get('/scores/class-stats', { params });

// NL2SQL
export const nl2sqlQuery = (question, operatorInfo = {}) => api.post('/nl2sql/query', { question, ...operatorInfo });

// 预警相关
export const getAlerts = (params) => api.get('/alerts/', { params });
export const generateAlerts = (operatorInfo = {}) => api.post('/alerts/generate', operatorInfo);
export const updateIntervention = (id, data) => api.put(`/alerts/${id}/intervene`, data);
export const getAlertStats = (params) => api.get('/alerts/stats', { params });

// 建议相关
export const getSuggestions = (id) => api.get(`/suggestions/${id}`);
export const generateSuggestion = (id, operatorInfo = {}) => api.post(`/suggestions/generate/${id}`, operatorInfo);
export const updateSuggestionFeedback = (id, data) => api.put(`/suggestions/${id}/feedback`, data);

// 变更历史
export const getChangeHistory = (params) => api.get('/change-history/', { params });

export default api;
