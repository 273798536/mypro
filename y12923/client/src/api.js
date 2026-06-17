import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const healthCheck = () => api.get('/health');

export const getRules = () => api.get('/rules');
export const createRule = (data) => api.post('/rules', data);
export const updateRule = (id, data) => api.put(`/rules/${id}`, data);
export const deleteRule = (id) => api.delete(`/rules/${id}`);

export const getBatches = () => api.get('/batches');
export const getBatchSamples = (batchId, params = {}) => api.get(`/batches/${batchId}/samples`, { params });
export const getBatchSummary = (batchId) => api.get(`/batches/${batchId}/summary`);
export const runRegression = (batchId) => api.post(`/batches/${batchId}/regression`);
export const exportBatch = (batchId) => {
  window.open(`/api/batches/${batchId}/export`, '_blank');
};

export const importBatch = (formData) => api.post('/batches/import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

export const correctSample = (sampleId, data) => api.post(`/samples/${sampleId}/correct`, data);
export const getSampleHistory = (sampleId) => api.get(`/samples/${sampleId}/history`);

export const detectText = (content) => api.post('/detect', { content });

export default api;
