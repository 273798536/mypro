import axios from 'axios';
import type {
  ParameterSheet, ParameterRow, UploadResponse, RegressionResult,
  AnomalyPoint, ReviewDashboard, ReviewUpdate,
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const sheetApi = {
  list: () => api.get<ParameterSheet[]>('/sheets').then(r => r.data),
  get: (id: number) => api.get<ParameterSheet>(`/sheets/${id}`).then(r => r.data),
  upload: (file: File, version: string, uploadedBy: string, notes: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('version', version);
    fd.append('uploaded_by', uploadedBy);
    fd.append('notes', notes);
    return api.post<UploadResponse>('/sheets/upload', fd).then(r => r.data);
  },
  rows: (id: number, onlyIssues = false) =>
    api.get<ParameterRow[]>(`/sheets/${id}/rows`, { params: { only_issues: onlyIssues } }).then(r => r.data),
  runRegression: (id: number, segments = 2, zThreshold = 2.5) =>
    api.post<RegressionResult>(`/sheets/${id}/run`, null, {
      params: { num_segments: segments, z_threshold: zThreshold },
    }).then(r => r.data),
  results: (id: number) => api.get<RegressionResult[]>(`/sheets/${id}/results`).then(r => r.data),
  dashboard: (id: number) => api.get<ReviewDashboard>(`/sheets/${id}/dashboard`).then(r => r.data),
};

export const rowApi = {
  get: (id: number) => api.get<ParameterRow>(`/rows/${id}`).then(r => r.data),
  edit: (id: number, fieldName: string, newValue: string, changedBy: string, reason: string) => {
    const fd = new FormData();
    fd.append('field_name', fieldName);
    fd.append('new_value', newValue);
    fd.append('changed_by', changedBy);
    fd.append('reason', reason);
    return api.patch(`/rows/${id}/edit`, fd).then(r => r.data);
  },
};

export const anomalyApi = {
  updateReview: (id: number, body: ReviewUpdate) =>
    api.patch<AnomalyPoint>(`/anomalies/${id}/review`, body).then(r => r.data),
  getOriginRow: (id: number) => api.get<ParameterRow>(`/anomalies/${id}/row`).then(r => r.data),
};
