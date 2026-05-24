import axios from 'axios';
import type { Chain, ChainListItem, DashboardStats, DirtyDataRecord } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'X-Operator-ID': 'user-001',
    'X-Operator-Name': '演示用户',
  },
});

export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    api.get('/dashboard/stats').then(res => res.data),
};

export const chainApi = {
  getList: (params?: {
    storeName?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: ChainListItem[]; total: number; page: number; pageSize: number }> =>
    api.get('/chains', { params }).then(res => res.data),

  getDetail: (id: string, includeTechView = false): Promise<Chain> =>
    api.get(`/chains/${id}`, {
      headers: includeTechView ? { 'X-Include-Tech-View': 'true' } : {},
    }).then(res => res.data),

  generate: (data: {
    storeName: string;
    businessDate: string;
    materialIds: string[];
  }): Promise<Chain> =>
    api.post('/chains/generate', data).then(res => res.data),

  getTimeline: (id: string): Promise<{ timeline: any[] }> =>
    api.get(`/chains/${id}/timeline`).then(res => res.data),
};

export const materialApi = {
  getList: (params?: {
    type?: string;
    storeName?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api.get('/materials', { params }).then(res => res.data),

  get: (id: string) =>
    api.get(`/materials/${id}`).then(res => res.data),

  import: (data: {
    type: string;
    rawContent: any;
    parsedData: any;
    sourceFile?: string;
    handleMode?: string;
  }) =>
    api.post('/materials/import', data).then(res => res.data),

  update: (id: string, parsedData: any) =>
    api.put(`/materials/${id}`, { parsedData }).then(res => res.data),
};

export const dirtyDataApi = {
  getList: (params?: { status?: string; type?: string }): Promise<DirtyDataRecord[]> =>
    api.get('/dirty-data', { params }).then(res => res.data),

  fix: (id: string, data: { finalValue: any; fixNote: string }) =>
    api.post(`/dirty-data/${id}/fix`, data).then(res => res.data),

  ignore: (id: string, data: { fixNote: string }) =>
    api.post(`/dirty-data/${id}/ignore`, data).then(res => res.data),
};

export const reconciliationApi = {
  start: (chainId: string) =>
    api.post('/reconciliation/start', { chainId }).then(res => res.data),

  get: (chainId: string) =>
    api.get(`/reconciliation/${chainId}`).then(res => res.data),

  confirm: (chainId: string, confirmedData: any) =>
    api.post(`/reconciliation/${chainId}/confirm`, { confirmedData }).then(res => res.data),
};

export const exportApi = {
  generate: (data: { chainIds: string[]; format: string }) =>
    api.post('/export/generate', data).then(res => res.data),

  getTasks: () =>
    api.get('/export/tasks').then(res => res.data),

  download: (taskId: string) =>
    api.get(`/export/download/${taskId}`, { responseType: 'blob' }),
};

export const techViewApi = {
  getHttpLogs: (chainId?: string) =>
    api.get('/tech-view/http-logs', { params: chainId ? { chainId } : {} }).then(res => res.data),

  getSqlLogs: (chainId?: string) =>
    api.get('/tech-view/sql-logs', { params: chainId ? { chainId } : {} }).then(res => res.data),

  getCommands: () =>
    api.get('/tech-view/commands').then(res => res.data),
};

export default api;
