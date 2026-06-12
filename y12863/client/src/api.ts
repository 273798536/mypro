import {
  AnchorageRecord,
  DriftCalculationResult,
  ImportBatch,
  MonthlyReport,
  ReviewHistory,
} from './types';

const API = '/api';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return (await res.json()) as T;
}

export const api = {
  getRecords: () => json<AnchorageRecord[]>(`${API}/records`),
  getRecord: (id: string) => json<AnchorageRecord>(`${API}/records/${id}`),
  getHistory: (id: string) => json<ReviewHistory[]>(`${API}/records/${id}/history`),

  updateStatus: (
    id: string,
    body: { status?: string; reviewStatus?: string; reviewer?: string; remark?: string }
  ) =>
    json<AnchorageRecord>(`${API}/records/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  updateDrift: (
    id: string,
    body: {
      reportedLat: number;
      reportedLng: number;
      actualLat: number;
      actualLng: number;
      reviewer?: string;
      remark?: string;
    }
  ) =>
    json<AnchorageRecord>(`${API}/records/${id}/drift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  attachPhoto: (id: string, file: File, remark: string) => {
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('remark', remark);
    return json<AnchorageRecord>(`${API}/records/${id}/photos`, {
      method: 'POST',
      body: fd,
    });
  },

  importFile: (file: File, operator = '调度员') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('operator', operator);
    return json<{
      batch: ImportBatch;
      imported: AnchorageRecord[];
      duplicates: AnchorageRecord[];
      errors: string[];
    }>(`${API}/import`, { method: 'POST', body: fd });
  },

  getBatches: () => json<ImportBatch[]>(`${API}/batches`),

  calculateDrift: (body: {
    reportedLat: number;
    reportedLng: number;
    actualLat: number;
    actualLng: number;
  }) =>
    json<DriftCalculationResult>(`${API}/drift/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getMonthlyReport: (month: string) => json<MonthlyReport>(`${API}/report/monthly/${month}`),
  getMonthlyCsvUrl: (month: string) => `${API}/report/monthly/${month}/csv`,
};
