import type {
  SensorRecord,
  Anomaly,
  PointStatus,
  ReportOptions,
  ReportResult,
  StatsSummary,
} from 'shared/types';

async function request<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data;
}

export const api = {
  seed: () => request<{ records: number; anomalies: number }>('/api/records/seed', { method: 'POST' }),
  runDetection: () => request<{ count: number; data: Anomaly[] }>('/api/detect/adjacent', { method: 'POST' }),
  getStats: () => request<{ data: StatsSummary }>('/api/stats').then(r => r.data),
  getRecords: () => request<{ data: SensorRecord[] }>('/api/records').then(r => r.data),
  getAnomalies: () => request<{ data: Anomaly[] }>('/api/anomalies').then(r => r.data),
  getAnomalyDetail: (id: string) =>
    request<{ data: { anomaly: Anomaly; sensor_record: SensorRecord | null } }>(`/api/anomalies/${id}`).then(r => r.data),
  updateRemark: (id: string, remark: string) =>
    request<{ data: Anomaly }>(`/api/anomalies/${id}/remark`, {
      method: 'PATCH',
      body: JSON.stringify({ remark }),
    }).then(r => r.data),
  updateStatus: (id: string, status: PointStatus) =>
    request<{ data: Anomaly }>(`/api/anomalies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then(r => r.data),
  generateReport: (opts: ReportOptions = {}) => {
    const params = new URLSearchParams();
    if (opts.statuses?.length) params.set('statuses', opts.statuses.join(','));
    if (opts.point_range) {
      params.set('start', opts.point_range.start);
      params.set('end', opts.point_range.end);
    }
    if (opts.anomaly_ids?.length) params.set('ids', opts.anomaly_ids.join(','));
    const q = params.toString();
    return request<{ data: ReportResult }>(`/api/report${q ? '?' + q : ''}`).then(r => r.data);
  },
  downloadReport: (opts: ReportOptions = {}) => {
    const params = new URLSearchParams();
    if (opts.statuses?.length) params.set('statuses', opts.statuses.join(','));
    if (opts.point_range) {
      params.set('start', opts.point_range.start);
      params.set('end', opts.point_range.end);
    }
    if (opts.anomaly_ids?.length) params.set('ids', opts.anomaly_ids.join(','));
    const q = params.toString();
    window.open(`/api/report/download${q ? '?' + q : ''}`, '_blank');
  },
  generateSingleReport: (id: string) =>
    request<{ data: ReportResult }>(`/api/report/${id}`).then(r => r.data),
  downloadSingleReport: (id: string) => {
    window.open(`/api/report/${id}/download`, '_blank');
  },
};
