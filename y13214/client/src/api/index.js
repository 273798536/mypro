import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const royaltyApi = {
  getRecords: (params) => api.get('/royalty/records', { params }).then((r) => r.data),
  getRecord: (id) => api.get(`/royalty/records/${id}`).then((r) => r.data),
  createRecord: (data) => api.post('/royalty/records', data).then((r) => r.data),
  updateRecord: (id, data) => api.put(`/royalty/records/${id}`, data).then((r) => r.data),
  deleteRecord: (id) => api.delete(`/royalty/records/${id}`).then((r) => r.data),
  importFile: (file, operator = 'operator') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('operator', operator);
    return api.post('/royalty/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data);
  },
  exportExcel: () => window.open('/api/royalty/export', '_blank'),
  getVersions: () => api.get('/royalty/versions').then((r) => r.data),
  getVersion: (id) => api.get(`/royalty/versions/${id}`).then((r) => r.data),
  restoreVersion: (id, operator = 'operator') =>
    api.post(`/royalty/versions/${id}/restore`, { operator }).then((r) => r.data),
  createVersion: (label, operator = 'operator') =>
    api.post('/royalty/versions', { label, operator }).then((r) => r.data),
  getHistory: (params) => api.get('/royalty/history', { params }).then((r) => r.data),
  getSummary: () => api.get('/royalty/summary').then((r) => r.data),
  getSettings: () => api.get('/royalty/settings').then((r) => r.data),
  updateSettings: (data) => api.put('/royalty/settings', data).then((r) => r.data),
  uploadScreenshot: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/royalty/screenshot', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data);
  }
};

export default api;
