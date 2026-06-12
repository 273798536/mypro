import type {
  RiskOverview,
  RiskRecord,
  ConflictRecord,
  PlatformPoint,
  PlatformDetail,
  SeaLayerData,
  BatchInfo,
  ReportDetail,
  ReportListItem,
  DatabaseStatus,
  RiskLevel,
  Severity,
  ConflictStatus,
  ResolutionType,
} from '@/types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getRiskOverview: (batchId?: string) =>
    request<RiskOverview>(`/risks/overview${batchId ? `?batchId=${batchId}` : ''}`),

  getRisks: (params?: { level?: RiskLevel; platformId?: string; batchId?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.level) query.set('level', params.level);
    if (params?.platformId) query.set('platformId', params.platformId);
    if (params?.batchId) query.set('batchId', params.batchId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    return request<{ total: number; items: RiskRecord[] }>(`/risks?${query.toString()}`);
  },

  getConflicts: (params?: { severity?: Severity; status?: ConflictStatus; batchId?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.severity) query.set('severity', params.severity);
    if (params?.status) query.set('status', params.status);
    if (params?.batchId) query.set('batchId', params.batchId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    return request<{ total: number; items: ConflictRecord[] }>(`/conflicts?${query.toString()}`);
  },

  resolveConflict: (id: string, resolution: ResolutionType, remark: string) =>
    request<{ success: boolean }>(`/conflicts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, remark }),
    }),

  getPlatforms: () =>
    request<{ items: PlatformPoint[] }>('/map/platforms'),

  getPlatformDetail: (id: string) =>
    request<PlatformDetail>(`/map/platforms/${id}`),

  getSeaLayer: (type: 'tide' | 'wave' | 'wind', time?: string) =>
    request<SeaLayerData>(`/map/sealayer?type=${type}${time ? `&time=${time}` : ''}`),

  getBatches: () =>
    request<{ items: BatchInfo[] }>('/import/batches'),

  runInspection: (batchId: string) =>
    request<{ success: boolean; batchId: string; conflictCount: number; riskCount: number }>('/import/run-inspection', {
      method: 'POST',
      body: JSON.stringify({ batchId }),
    }),

  generateReport: (params: { batchId?: string; platformId?: string; format: 'pdf' | 'xlsx' }) =>
    request<{ success: boolean; reportId: string; downloadUrl: string; title: string }>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getReport: (id: string) =>
    request<ReportDetail>(`/reports/${id}`),

  getReports: () =>
    request<{ items: ReportListItem[] }>('/reports'),

  getDatabaseStatus: () =>
    request<DatabaseStatus>('/database/status'),

  importTide: (formData: FormData) =>
    request<{ success: boolean; count: number; batchId: string; batchName: string }>('/import/tide', {
      method: 'POST',
      body: formData,
      headers: {},
    }),

  importBuoy: (formData: FormData) =>
    request<{ success: boolean; count: number; batchId: string; batchName: string }>('/import/buoy', {
      method: 'POST',
      body: formData,
      headers: {},
    }),

  importEquipment: (formData: FormData) =>
    request<{ success: boolean; count: number }>('/import/equipment', {
      method: 'POST',
      body: formData,
      headers: {},
    }),
};

export default api;
