import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000
});

export const sampleApi = {
  list: (params?: { reagent_batch?: string; review_status?: string; import_batch?: string; page?: number; pageSize?: number }) =>
    api.get('/samples', { params }).then(r => r.data),
  get: (id: string) => api.get(`/samples/${id}`).then(r => r.data),
  create: (data: any) => api.post('/samples', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/samples/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/samples/${id}`).then(r => r.data),
  batches: () => api.get('/samples/batches/list').then(r => r.data)
};

export const importApi = {
  importSamples: (file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/import/samples', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round(e.loaded * 100 / e.total) : 0)
    }).then(r => r.data);
  },
  importImages: (files: File[], onProgress?: (p: number) => void) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return api.post('/import/images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round(e.loaded * 100 / e.total) : 0)
    }).then(r => r.data);
  },
  records: () => api.get('/import/records').then(r => r.data)
};

export const imageApi = {
  list: (params?: { sample_id?: string; unlinked?: boolean; import_batch?: string }) =>
    api.get('/images', { params }).then(r => r.data),
  get: (id: string) => api.get(`/images/${id}`).then(r => r.data),
  fileUrl: (id: string) => `/api/images/${id}/file`,
  update: (id: string, data: any) => api.put(`/images/${id}`, data).then(r => r.data),
  link: (image_id: string, sample_id: string) =>
    api.post('/images/link', { image_id, sample_id }).then(r => r.data),
  addAnnotation: (imageId: string, data: any) =>
    api.post(`/images/${imageId}/annotations`, data).then(r => r.data),
  deleteAnnotation: (annotationId: string) =>
    api.delete(`/images/annotations/${annotationId}`).then(r => r.data)
};

export const reportApi = {
  dashboard: (params?: { reagent_batch?: string }) =>
    api.get('/reports/dashboard', { params }).then(r => r.data),
  list: () => api.get('/reports').then(r => r.data),
  getData: (reagentBatch: string) =>
    api.get(`/reports/${reagentBatch}/data`).then(r => r.data),
  export: (reagentBatch: string) =>
    api.get(`/reports/${reagentBatch}/export`, { responseType: 'blob' }),
  create: (data: any) => api.post('/reports', data).then(r => r.data),
  statistics: (params?: { group_by?: string; start_date?: string; end_date?: string }) =>
    api.get('/reports/statistics/grouped', { params }).then(r => r.data)
};

export default api;
