import axios from 'axios';
import {
  Layer,
  ExceptionRecord,
  ProcessingRecord,
  FilterCriteria,
  ExceptionListResponse,
  ImportResult,
  CanvasOverview,
  ReviewResponse,
  ConsistencyResult,
  RecordStatus
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const layerApi = {
  list: (): Promise<Layer[]> => api.get('/layers').then(r => r.data),
  get: (id: string): Promise<Layer> => api.get(`/layers/${id}`).then(r => r.data),
  updateStatus: (id: string, status: string, canvasStatus: string): Promise<Layer> =>
    api.put(`/layers/${id}/status`, { status, canvasStatus }).then(r => r.data)
};

export const exceptionApi = {
  list: (filters?: FilterCriteria): Promise<ExceptionListResponse> => {
    const params: any = {};
    if (filters) {
      if (filters.status?.length) params.status = filters.status;
      if (filters.type?.length) params.type = filters.type;
      if (filters.recordType?.length) params.recordType = filters.recordType;
      if (filters.layerId) params.layerId = filters.layerId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.source) params.source = filters.source;
      if (filters.keyword) params.keyword = filters.keyword;
    }
    return api.get('/exceptions', { params }).then(r => r.data);
  },
  get: (id: string): Promise<ExceptionRecord> =>
    api.get(`/exceptions/${id}`).then(r => r.data),
  create: (records: Partial<ExceptionRecord> | Partial<ExceptionRecord>[]): Promise<ImportResult> =>
    api.post('/exceptions', records).then(r => r.data),
  update: (id: string, updates: Partial<ExceptionRecord>): Promise<ExceptionRecord> =>
    api.put(`/exceptions/${id}`, updates).then(r => r.data),
  remove: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/exceptions/${id}`).then(r => r.data),
  getProcessingHistory: (id: string): Promise<ProcessingRecord[]> =>
    api.get(`/exceptions/${id}/records`).then(r => r.data),
  addProcessingRecord: (
    id: string,
    data: {
      action: string;
      operator: string;
      opinion: string;
      previousStatus: RecordStatus;
      newStatus: RecordStatus;
    }
  ): Promise<ProcessingRecord> =>
    api.post(`/exceptions/${id}/records`, data).then(r => r.data)
};

export const reviewApi = {
  list: (): Promise<ReviewResponse> => api.get('/review').then(r => r.data),
  batchReview: (data: {
    ids: string[];
    conclusion: RecordStatus;
    comment: string;
    reviewer: string;
  }): Promise<{ success: boolean; processed: number; conclusion: RecordStatus }> =>
    api.post('/review/batch', data).then(r => r.data),
  export: (format: 'csv' | 'json' = 'csv', type?: string): Promise<Blob> =>
    api.get('/review/export', {
      params: { format, type },
      responseType: 'blob'
    }).then(r => r.data)
};

export const canvasApi = {
  overview: (): Promise<CanvasOverview> => api.get('/canvas/overview').then(r => r.data)
};

export const consistencyApi = {
  check: (): Promise<ConsistencyResult> => api.get('/consistency-check').then(r => r.data)
};

export default api;
