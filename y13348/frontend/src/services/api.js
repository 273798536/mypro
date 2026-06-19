import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  listUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
};

export const sessionAPI = {
  list: (params) => api.get('/sessions', { params }),
  create: (data) => api.post('/sessions', data),
  get: (id) => api.get(`/sessions/${id}`),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  process: (id) => api.post(`/sessions/${id}/process`),
  complete: (id) => api.post(`/sessions/${id}/complete`),
  rerun: (id, data) => api.post(`/sessions/${id}/rerun`, data),
};

export const correctionAPI = {
  list: (params) => api.get('/corrections', { params }),
  create: (data) => api.post('/corrections', data),
  get: (id) => api.get(`/corrections/${id}`),
  override: (id) => api.delete(`/corrections/${id}`),
  getHistory: (sessionId, targetItemId) => 
    api.get(`/corrections/session/${sessionId}/history`, { 
      params: { target_item_id: targetItemId } 
    }),
};

export const leakAPI = {
  list: (params) => api.get('/leaks', { params }),
  create: (sessionId, data) => api.post('/leaks', data, { params: { session_id: sessionId } }),
  get: (id) => api.get(`/leaks/${id}`),
  confirm: (id, data) => api.post(`/leaks/${id}/confirm`, data),
  resolve: (id, data) => api.post(`/leaks/${id}/resolve`, data),
  dismiss: (id, reason) => api.post(`/leaks/${id}/dismiss`, null, { params: { reason } }),
  getImpactAnalysis: (sessionId) => api.get(`/leaks/session/${sessionId}/impact-analysis`),
};

export const reportAPI = {
  list: (params) => api.get('/reports', { params }),
  create: (data) => api.post('/reports', data),
  generate: (sessionId, reportName) => 
    api.post(`/reports/generate/${sessionId}`, null, { params: { report_name: reportName } }),
  get: (id) => api.get(`/reports/${id}`),
  getComponent: (id, componentType) => api.get(`/reports/${id}/component/${componentType}`),
  export: (id, data) => api.post(`/reports/${id}/export`, data),
};

export const guideAPI = {
  list: (activeOnly = true) => api.get('/guides', { params: { active_only: activeOnly } }),
  getByPosition: (position) => api.get(`/guides/by-position/${position}`),
  create: (data) => api.post('/guides', data),
  update: (id, data) => api.put(`/guides/${id}`, data),
  delete: (id) => api.delete(`/guides/${id}`),
};

export const commentAPI = {
  list: (sessionId, commentType) => 
    api.get(`/comments/session/${sessionId}`, { params: { comment_type: commentType } }),
  create: (data) => api.post('/comments', data),
  update: (id, content) => api.put(`/comments/${id}`, null, { params: { content } }),
  delete: (id) => api.delete(`/comments/${id}`),
};

export const snapshotAPI = {
  list: (sessionId, snapshotType) => 
    api.get(`/snapshots/session/${sessionId}`, { params: { snapshot_type: snapshotType } }),
  getLatest: (sessionId, snapshotType) => 
    api.get(`/snapshots/session/${sessionId}/latest`, { params: { snapshot_type: snapshotType } }),
  create: (data) => api.post('/snapshots', data),
  get: (id) => api.get(`/snapshots/${id}`),
  delete: (id) => api.delete(`/snapshots/${id}`),
};

export default api;
