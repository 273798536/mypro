import type {
  DashboardSummary,
  Batch,
  BatchStatus,
  ImportRequest,
  ImportResponse,
  BatchDetail,
  Anomaly,
  AnomalyType,
  AnomalyStatus,
  OpinionAction,
  ReportRecord,
  ComparisonResult,
  ApiResult,
} from '@shared/types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('网络请求失败，请检查服务是否启动');
  }

  let body: ApiResult<T>;
  try {
    body = (await res.json()) as ApiResult<T>;
  } catch {
    throw new Error(`响应解析失败 (${res.status})`);
  }

  if (!body || !body.success) {
    throw new Error(body?.error || `请求失败 (${res.status})`);
  }
  return body.data as T;
}

function withQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function getDashboard() {
  return request<DashboardSummary>('/batches/dashboard');
}

export function listBatches(params?: { status?: BatchStatus; q?: string }) {
  return request<Batch[]>(`/batches${withQuery(params)}`);
}

export function importBatch(body: ImportRequest) {
  return request<ImportResponse>('/batches/import', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getBatchDetail(id: string) {
  return request<BatchDetail>(`/batches/${id}`);
}

export function advanceStatus(id: string, status: BatchStatus) {
  return request<Batch>(`/batches/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function listAnomalies(
  batchId: string,
  params?: { type?: AnomalyType; status?: AnomalyStatus },
) {
  return request<Anomaly[]>(`/batches/${batchId}/anomalies${withQuery(params)}`);
}

export function getAnomaly(id: string) {
  return request<Anomaly>(`/anomalies/${id}`);
}

export function reviewAnomaly(
  id: string,
  body: {
    action?: OpinionAction;
    text?: string;
    reviewer?: string;
    status?: AnomalyStatus;
  },
) {
  return request<Anomaly>(`/anomalies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function generateReport(batchId: string) {
  return request<ReportRecord>(`/batches/${batchId}/report`, { method: 'POST' });
}

export function getReport(batchId: string) {
  return request<ReportRecord | null>(`/batches/${batchId}/report`);
}

export function compareBatches(batchId: string, againstBatchId: string) {
  return request<ComparisonResult>(`/batches/${batchId}/compare`, {
    method: 'POST',
    body: JSON.stringify({ againstBatchId }),
  });
}

export function listComparisons(batchId: string) {
  return request<ComparisonResult[]>(`/batches/${batchId}/comparisons`);
}
