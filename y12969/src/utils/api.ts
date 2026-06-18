import type {
  AuditRound,
  BackupRecord,
  Anomaly,
  IndexSuggestion,
  StatusLog,
  CapacityTrendPoint,
  TypeDriftDetail,
  ReportData,
} from '../../shared/types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return text as unknown as T;
  }
  if (!data.success) {
    throw new Error(data.error || '请求失败');
  }
  return data.data as T;
}

export const api = {
  getRounds: () => request<AuditRound[]>('/api/rounds'),
  createRound: (name: string, operator = '审计员') =>
    request<AuditRound>('/api/rounds', {
      method: 'POST',
      body: JSON.stringify({ name, operator }),
    }),
  archiveRound: (id: string) =>
    request<void>(`/api/rounds/${id}/archive`, { method: 'POST' }),
  getTrend: (id: string) =>
    request<CapacityTrendPoint[]>(`/api/rounds/${id}/trend`),

  importRecords: (roundId: string, records: Array<Partial<BackupRecord>>) =>
    request<{ importedCount: number; ids: string[] }>('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify({ roundId, records }),
    }),
  getRecords: (roundId: string) =>
    request<BackupRecord[]>(`/api/backup/records?roundId=${roundId}`),
  getTypeDrift: (recordId: string) =>
    request<TypeDriftDetail>(`/api/backup/records/${recordId}/type-drift`),

  getAnomalies: (roundId: string) =>
    request<Anomaly[]>(`/api/anomalies?roundId=${roundId}`),
  advanceAnomalyStatus: (id: string, operator = '审计员', remark = '') =>
    request<Anomaly>(`/api/anomalies/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ operator, remark }),
    }),
  supplyMaterial: (id: string, material: string, workOrder?: string) =>
    request<{ message: string; workOrder?: string }>(`/api/anomalies/${id}/supply-material`, {
      method: 'POST',
      body: JSON.stringify({ material, workOrder }),
    }),
  adjustCaliber: (id: string, reason: string) =>
    request<{ message: string }>(`/api/anomalies/${id}/adjust-caliber`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getIndexSuggestions: (roundId: string) =>
    request<IndexSuggestion[]>(`/api/index-suggestions?roundId=${roundId}`),
  reattribute: (id: string, workOrder?: string, extraReason?: string) =>
    request<IndexSuggestion & { attributionBefore: string; attributionAfter: string }>(
      `/api/index-suggestions/${id}/reattribute`,
      {
        method: 'POST',
        body: JSON.stringify({ workOrder, extraReason }),
      },
    ),

  getLogs: (roundId: string) =>
    request<StatusLog[]>(`/api/logs?roundId=${roundId}`),

  getReportPreview: (roundId: string) =>
    request<ReportData>(`/api/report/${roundId}/preview`),
  getReportExportUrl: (roundId: string) => `/api/report/${roundId}/export.xlsx`,
};

export const ANOMALY_TYPE_LABEL: Record<string, string> = {
  type_drift: '字段类型漂移',
  data_mismatch: '容量数据不一致',
  missing_record: '缺失记录',
  slow_query: '慢查询',
};

export const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  reviewing: '复核中',
  resolved: '已处理',
  confirmed: '已确认',
  active: '进行中',
  archived: '已归档',
};

export const ACTION_LABEL: Record<string, string> = {
  supply_material: '补材料',
  adjust_caliber: '改口径',
  skip: '跳过',
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}
