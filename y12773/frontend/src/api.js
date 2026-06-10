import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

export const getDashboard = () => api.get('/dashboard').then(r => r.data);
export const getBatches = (params) => api.get('/batches', { params }).then(r => r.data);
export const getBatchDetail = (id) => api.get(`/batches/${id}`).then(r => r.data);
export const getTests = (params) => api.get('/tests', { params }).then(r => r.data);
export const getTestHistory = (id) => api.get(`/tests/${id}/history`).then(r => r.data);
export const reviewTest = (id, data) => api.post(`/tests/${id}/review`, data).then(r => r.data);
export const importData = (data) => api.post('/import', data).then(r => r.data);
export const exportData = (format) => {
  if (format === 'csv') {
    window.open('/api/export?format=csv', '_blank');
    return Promise.resolve();
  }
  return api.get('/export').then(r => r.data);
};
export const getStatusFlow = () => api.get('/status-flow').then(r => r.data);

export default api;
