import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'X-Operator': localStorage.getItem('operator') || '运营主管' },
});

api.interceptors.response.use(
  r => r.data,
  err => {
    const msg = err.response?.data?.error || err.message || '请求失败';
    if (typeof window !== 'undefined') {
      try { window.__ant_msg?.error(msg); } catch {}
    }
    return Promise.reject(err);
  }
);

export function setOperator(name) {
  localStorage.setItem('operator', name);
  api.defaults.headers['X-Operator'] = name;
}

export default api;

export const statsAPI = () => api.get('/stats');
export const tracksAPI = (params) => api.get('/tracks', { params });
export const trackDetailAPI = (id) => api.get(`/tracks/${id}`);
export const createTrackAPI = (data) => api.post('/tracks', data);
export const updateTrackAPI = (id, data) => api.put(`/tracks/${id}`, data);
export const deleteTrackAPI = (id) => api.delete(`/tracks/${id}`);
export const trackHistoryAPI = (id) => api.get(`/tracks/${id}/history`);

export const alertsAPI = (params) => api.get('/alerts', { params });
export const resolveAlertAPI = (id, remark) => api.post(`/alerts/${id}/resolve`, { remark });
export const runChecksAPI = () => api.post('/checks/run');

export const conflictsAPI = (resolved) => api.get('/conflicts', { params: { resolved } });
export const resolveConflictAPI = (id, data) => api.post(`/conflicts/${id}/resolve`, data);

export const importCsvAPI = (formData) => api.post('/csv/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const exportCsvUrl = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return `/api/csv/export${qs ? '?' + qs : ''}`;
};
export const exportConflictsUrl = () => `/api/csv/export-conflicts`;
export const exportHistoryUrl = (id) => `/api/tracks/${id}/history.csv`;

export const alignAuthAPI = (pattern) => api.post('/align/auth', { pattern });
export const alignReconcileAPI = () => api.post('/align/reconcile');

export const downloadFile = (url, filename) => {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.click();
};
