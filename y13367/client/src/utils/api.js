import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

export const getGrayConfigs = () => api.get('/gray-configs').then(r => r.data);
export const getPlaybackRuns = (params) => api.get('/playback-runs', { params }).then(r => r.data);
export const getPlaybackRun = (runId) => api.get(`/playback-runs/${runId}`).then(r => r.data);
export const createPlaybackRun = (data) => api.post('/playback-runs', data).then(r => r.data);

export const getSamples = (params) => api.get('/samples', { params }).then(r => r.data);
export const getSample = (sampleId) => api.get(`/samples/${sampleId}`).then(r => r.data);
export const correctSample = (sampleId, data) => api.post(`/samples/${sampleId}/correct`, data).then(r => r.data);

export const getAnomalyQueue = (params) => api.get('/anomaly-queue', { params }).then(r => r.data);
export const getImpactAnalysis = (params) => api.get('/impact-analysis', { params }).then(r => r.data);
export const exportSamples = (params) => {
  const query = new URLSearchParams(params).toString();
  window.open(`/api/export/samples?${query}`, '_blank');
};

export const getUsers = () => api.get('/users').then(r => r.data);

export default api;
