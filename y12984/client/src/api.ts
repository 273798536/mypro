import axios from 'axios';
import { Run, ReportRecord, Anomaly, Permission, OverviewStats, NextAction, AnomalyStatus, MigrationStatus } from './types';

const api = axios.create({ baseURL: '/api' });

export const runApi = {
  list: () => api.get<Run[]>('/runs').then((r) => r.data),
  get: (id: number) => api.get<Run>(`/runs/${id}`).then((r) => r.data),
  remove: (id: number) => api.delete(`/runs/${id}`).then((r) => r.data)
};

export const importApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ runId: number; recordCount: number }>('/import', form).then((r) => r.data);
  }
};

export const recordApi = {
  list: (params: { run_id: number; anomaly_type?: string; migration_status?: string; has_anomaly?: boolean }) =>
    api.get<ReportRecord[]>('/records', { params }).then((r) => r.data),
  get: (id: number) => api.get<ReportRecord>(`/records/${id}`).then((r) => r.data),
  updateMigrationStatus: (id: number, status: MigrationStatus) =>
    api.patch(`/records/${id}/migration-status`, { status }).then((r) => r.data)
};

export const anomalyApi = {
  list: (recordId: number) => api.get<Anomaly[]>(`/records/${recordId}/anomalies`).then((r) => r.data),
  update: (id: number, data: { next_action?: NextAction; handling_opinion?: string; status?: AnomalyStatus; source_details?: string }) =>
    api.patch(`/anomalies/${id}`, data).then((r) => r.data)
};

export const permissionApi = {
  list: (recordId: number) => api.get<Permission[]>(`/records/${recordId}/permissions`).then((r) => r.data),
  create: (recordId: number, data: { permission_name: string; grantee: string; granted_by: string }) =>
    api.post(`/records/${recordId}/permissions`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/permissions/${id}`).then((r) => r.data)
};

export const statsApi = {
  overview: (runId: number) =>
    api.get<OverviewStats>('/stats/overview', { params: { run_id: runId } }).then((r) => r.data)
};

export const exportApi = {
  downloadUrl: (runId: number) => `/api/export/${runId}`
};
