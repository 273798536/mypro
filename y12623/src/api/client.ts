import type { LoadingRecord, ImportResult, RecordDetail, ScoreHistory, ProcessingNote, ExportReport, RecordStatus, AnomalyType } from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const recordApi = {
  getRecords(filters?: { status?: RecordStatus; anomalyType?: AnomalyType; batchNo?: string; search?: string }): Promise<LoadingRecord[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.anomalyType) params.set('anomalyType', filters.anomalyType);
    if (filters?.batchNo) params.set('batchNo', filters.batchNo);
    if (filters?.search) params.set('search', filters.search);
    return request<LoadingRecord[]>(`/records?${params.toString()}`);
  },

  getAnomalies(): Promise<LoadingRecord[]> {
    return request<LoadingRecord[]>('/records/anomalies');
  },

  getStats(): Promise<Record<RecordStatus, number>> {
    return request<Record<RecordStatus, number>>('/records/stats');
  },

  getRecordDetail(id: string): Promise<RecordDetail> {
    return request<RecordDetail>(`/records/${id}`);
  },

  getHistory(id: string): Promise<ScoreHistory[]> {
    return request<ScoreHistory[]>(`/records/${id}/history`);
  },

  updateScore(id: string, data: { score: number; scoreNote?: string; reason: string; scorer?: string }): Promise<LoadingRecord> {
    return request<LoadingRecord>(`/records/${id}/score`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  addNote(id: string, data: { content: string; author?: string }): Promise<ProcessingNote> {
    return request<ProcessingNote>(`/records/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  importFile(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return request<ImportResult>('/records/import', {
      method: 'POST',
      headers: {},
      body: formData as any,
    });
  },

  importSample(): Promise<ImportResult> {
    return request<ImportResult>('/records/import/sample', {
      method: 'POST',
    });
  },
};

export const exportApi = {
  generateReport(data: { startDate?: number; endDate?: number; status?: RecordStatus }): Promise<{ report: ExportReport; filePath: string }> {
    return request<{ report: ExportReport; filePath: string }>('/export', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyConsistency(records: LoadingRecord[]): Promise<{ consistent: boolean; diff: string }> {
    return request<{ consistent: boolean; diff: string }>('/export/verify', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  downloadReport(id: string) {
    window.open(`${API_BASE}/export/${id}/download`, '_blank');
  },
};
