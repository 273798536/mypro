import type {
  SimulationRecord,
  HistoryVersion,
  StatsSummary,
  UpdateRecordPayload,
  SectionFrame,
  ExportReportData,
} from '@shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export const api = {
  getStats: () => request<StatsSummary>('/records/stats'),
  getRecords: (params?: { riskLevel?: string; anomalyType?: string; search?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<SimulationRecord[]>(`/records${qs}`);
  },
  getRecord: (id: string) => request<SimulationRecord>(`/records/${id}`),
  updateRecord: (id: string, payload: UpdateRecordPayload) =>
    request<{ record: SimulationRecord; version: HistoryVersion }>(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  addSection: (id: string, section: SectionFrame) =>
    request<SimulationRecord>(`/records/${id}/sections`, {
      method: 'POST',
      body: JSON.stringify(section),
    }),
  getHistory: (id: string) => request<HistoryVersion[]>(`/records/${id}/history`),
  getHistoryVersion: (id: string, versionId: string) =>
    request<HistoryVersion>(`/records/${id}/history/${versionId}`),
  rollbackVersion: (id: string, versionId: string) =>
    request<SimulationRecord>(`/records/${id}/rollback/${versionId}`, { method: 'POST' }),
  getExportData: (id: string) => request<ExportReportData>(`/records/${id}/export`),
};
