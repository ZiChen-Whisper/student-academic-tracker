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
export const getTeacherStats = (params) => api.get('/teachers/stats', { params });

// 成绩相关
export const getScoreTrend = (id) => api.get(`/scores/trend/${id}`);
export const getOverview = (params) => api.get('/scores/overview', { params });
export const getScoreDistribution = (params) => api.get('/scores/distribution', { params });
export const getClassStats = (params) => api.get('/scores/class-stats', { params });
export const getClassScores = (params) => api.get('/scores/class-scores', { params });

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

// 管理员统计
export const getAdminStats = () => api.get('/admin/stats');

// 管理员全量排名
export const getAdminRankings = (type) => api.get(`/admin/rankings/${type}`);

// 数据管理
const adminHeaders = { headers: { 'X-Admin-Role': 'admin' } };
export const getTableList = () => api.get('/admin/data/tables', adminHeaders);
export const getTableData = (table, params) => api.get(`/admin/data/${table}`, { ...adminHeaders, params });
export const createTableRow = (table, data) => api.post(`/admin/data/${table}`, data, adminHeaders);
export const updateTableRow = (table, id, data) => api.put(`/admin/data/${table}/${id}`, data, adminHeaders);
export const deleteTableRow = (table, id) => api.delete(`/admin/data/${table}/${id}`, adminHeaders);

export default api;
