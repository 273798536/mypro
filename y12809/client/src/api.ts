import axios from 'axios';
import {
  Sample,
  RegionAnnotation,
  CultivationRecord,
  LineageNode,
  SequencingResult,
  BatchEffectReport,
  ReviewRecord,
  MonthlyHandoverReport,
  BatchInfo,
  DashboardStats,
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export const sampleApi = {
  getAll: (params?: { status?: string; reviewStatus?: string; batchId?: string; isUnavailable?: boolean }) =>
    api.get<Sample[]>('/samples', { params }).then((r) => r.data),
  getById: (id: string) => api.get<Sample>(`/samples/${id}`).then((r) => r.data),
  update: (id: string, data: Partial<Sample>) =>
    api.put<Sample>(`/samples/${id}`, data).then((r) => r.data),
  addAnnotation: (id: string, data: Omit<RegionAnnotation, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<RegionAnnotation>(`/samples/${id}/annotations`, data).then((r) => r.data),
  updateAnnotation: (
    id: string,
    aid: string,
    data: Partial<RegionAnnotation>
  ) => api.put<RegionAnnotation>(`/samples/${id}/annotations/${aid}`, data).then((r) => r.data),
  deleteAnnotation: (id: string, aid: string) =>
    api.delete(`/samples/${id}/annotations/${aid}`).then((r) => r.data),
  review: (
    id: string,
    data: { action: string; notes: string; reviewer: string }
  ) => api.post<{ sample: Sample; review: ReviewRecord }>(`/samples/${id}/review`, data).then((r) => r.data),
  getReviews: (id: string) => api.get<ReviewRecord[]>(`/samples/${id}/reviews`).then((r) => r.data),
};

export const batchApi = {
  getAll: () => api.get<BatchInfo[]>('/batches').then((r) => r.data),
  getReport: (id: string) => api.get<BatchEffectReport>(`/batches/${id}/report`).then((r) => r.data),
};

export const sequencingApi = {
  getBySample: (sampleId: string) =>
    api.get<SequencingResult[]>(`/sequencing/sample/${sampleId}`).then((r) => r.data),
  getByBatch: (batchId: string) =>
    api.get<SequencingResult[]>(`/sequencing/batch/${batchId}`).then((r) => r.data),
  getAll: () => api.get<SequencingResult[]>('/sequencing/all').then((r) => r.data),
};

export const lineageApi = {
  getById: (lineageId: string) =>
    api.get<{ lineageId: string; nodes: LineageNode[]; samples: Sample[] }>(`/lineage/${lineageId}`).then((r) => r.data),
  getBySample: (sampleId: string) =>
    api.get<{ lineageId: string; nodes: LineageNode[]; samples: Sample[] }>(`/samples/${sampleId}/lineage`).then((r) => r.data),
  correct: (data: { sampleId: string; newParentId?: string; notes?: string; operator?: string }) =>
    api.put(`/lineage/correct`, data).then((r) => r.data),
};

export const cultivationApi = {
  getBySample: (sampleId: string) =>
    api.get<CultivationRecord[]>(`/cultivation/${sampleId}`).then((r) => r.data),
  add: (data: Omit<CultivationRecord, 'id' | 'isSupplement' | 'createdAt'>) =>
    api.post<CultivationRecord>('/cultivation', data).then((r) => r.data),
};

export const reportApi = {
  getMonthlyHandover: (month: string) =>
    api.get<MonthlyHandoverReport>(`/monthly-handover/${month}`).then((r) => r.data),
  exportReport: (batchId?: string) => {
    const url = batchId ? `/api/report/export/${batchId}` : '/api/report/export';
    return axios.get(url, { responseType: 'blob', baseURL: '' }).then((r) => r.data);
  },
};

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
};
