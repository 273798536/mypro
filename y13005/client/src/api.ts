import type { AnomalyWithBatch, Batch, BatchDetail, ReviewHistory } from './types';

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
};

export const listBatches = () => api<Batch[]>('/api/batches');
export const getBatchDetail = (id: number) => api<BatchDetail>(`/api/batches/${id}`);
export const listAnomalies = () => api<AnomalyWithBatch[]>('/api/anomalies');
export const getReceiptHistory = (receiptId: number) => api<ReviewHistory[]>(`/api/receipts/${receiptId}/history`);

export interface OverridePayload {
  reviewer: string;
  manual_conclusion: string;
  override_reason: string;
  override_impact: string;
  status: 'pass' | 'fail' | 'needs_material' | 'pending';
  supplementary_material?: string;
  review_guidance?: string;
  needs_material?: string;
}

export const submitReview = (receiptId: number, payload: OverridePayload) =>
  api<{ ok: true; review_id: number }>(`/api/receipts/${receiptId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
