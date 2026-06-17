import type {
  Batch,
  Anomaly,
  Correction,
  Example,
  ModelLog,
} from '../../shared/types';

const API_PREFIX = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T, B = unknown>(path: string, body: B): Promise<T> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json() as Promise<T>;
}

async function postBlob<B = unknown>(path: string, body: B): Promise<Blob> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.blob();
}

export const api = {
  getBatches: () => get<Batch[]>('/batches'),
  getBatch: (id: string) => get<Batch>(`/batches/${id}`),
  getAnomalies: (params: { batchId?: string; type?: string; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.batchId) q.set('batchId', params.batchId);
    if (params.type && params.type !== 'all') q.set('type', params.type);
    if (params.status && params.status !== 'all') q.set('status', params.status);
    const qs = q.toString();
    return get<Anomaly[]>(`/anomalies${qs ? `?${qs}` : ''}`);
  },
  getAnomalyDetail: (id: string) =>
    get<{ anomaly: Anomaly; logs: ModelLog[]; examples: Example[]; correction?: Correction }>(
      `/anomalies/${id}`,
    ),
  getCorrections: () => get<Correction[]>('/corrections'),
  saveCorrection: (data: {
    anomalyId: string;
    action: string;
    opinion: string;
    operator?: string;
  }) => post<Correction, typeof data>('/corrections', data),
  getExamples: () => get<Example[]>('/examples'),
  getReportMeta: (batchId?: string) =>
    post<{
      fileNameBase: string;
      totalAnomalies: number;
      resolvedCount: number;
      pendingCount: number;
      generatedAt: string;
      batchId: string;
    }>('/report/metadata', { batchId }),
  runCheck: (data: {
    scenario?: 'mixed' | 'legacy_table' | 'supplement_remark' | 'missing_unit';
    sampleCount?: number;
    operator?: string;
  }) =>
    post<{
      ok: boolean;
      batch: Batch;
      anomalies: Anomaly[];
      logCount: number;
      message: string;
    }>('/check/run', data),
  downloadExcel: (batchId?: string, operator?: string) =>
    postBlob<{ batchId?: string; operator?: string }>('/report/excel', { batchId, operator }),
  downloadHtml: (batchId?: string, operator?: string) =>
    postBlob<{ batchId?: string; operator?: string }>('/report/html', { batchId, operator }),
};
