import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export default api;

export const dashboardApi = {
  getStats: () => api.get('/dashboard').then((r) => r.data),
};

export const runsApi = {
  list: (params?: { model_version?: string }) =>
    api.get('/runs', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/runs/${id}`).then((r) => r.data),
  records: (id: number, params?: any) =>
    api.get(`/runs/${id}/records`, { params }).then((r) => r.data),
  export: (id: number) => api.post(`/runs/${id}/export`).then((r) => r.data),
};

export const recordsApi = {
  get: (id: number) => api.get(`/records/${id}`).then((r) => r.data),
  history: (id: number) => api.get(`/records/${id}/history`).then((r) => r.data),
  judgments: (id: number) => api.get(`/records/${id}/judgments`).then((r) => r.data),
};

export const judgmentsApi = {
  create: (data: any) => api.post('/judgments', data).then((r) => r.data),
};

export const anomaliesApi = {
  list: (params?: any) => api.get('/anomalies', { params }).then((r) => r.data),
  create: (data: any) => api.post('/anomalies', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/anomalies/${id}`, data).then((r) => r.data),
};

export const compareApi = {
  runs: (runA: number, runB: number) =>
    api.get('/compare', { params: { run_a: runA, run_b: runB } }).then((r) => r.data),
};

export const importApi = {
  upload: (formData: FormData) =>
    api.post('/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
};

export const fieldMappingApi = {
  list: (params?: { run_id?: number }) =>
    api.get('/field-mappings', { params }).then((r) => r.data),
};
