import type {
  VolcanoRecord,
  UpdateConclusionRequest,
  ImportDataRequest,
  HistoryVersion,
  Perspective,
} from '@shared/types';

const API_BASE = 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

export const api = {
  getRecords: () =>
    request<{ success: boolean; data: VolcanoRecord[] }>('/records'),

  getRecord: (id: string) =>
    request<{ success: boolean; data: VolcanoRecord }>(`/records/${id}`),

  getHistory: (id: string) =>
    request<{ success: boolean; data: HistoryVersion[] }>(`/records/${id}/history`),

  updateConclusion: (id: string, body: UpdateConclusionRequest) =>
    request<{ success: boolean; data: VolcanoRecord }>(`/records/${id}/conclusion`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  restoreVersion: (recordId: string, historyId: string) =>
    request<{ success: boolean; data: VolcanoRecord }>(
      `/records/${recordId}/restore/${historyId}`,
      { method: 'POST' }
    ),

  addPerspective: (
    recordId: string,
    perspective: Omit<Perspective, 'id' | 'timestamp'>
  ) =>
    request<{ success: boolean; data: VolcanoRecord }>(
      `/records/${recordId}/perspective`,
      {
        method: 'POST',
        body: JSON.stringify(perspective),
      }
    ),

  deleteRecord: (id: string) =>
    request<{ success: boolean }>(`/records/${id}`, { method: 'DELETE' }),

  importData: (body: ImportDataRequest) =>
    request<{ success: boolean; data: VolcanoRecord; isNew: boolean; message: string }>(
      '/import',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),

  checkDuplicate: (batchId: string) =>
    request<{ success: boolean; exists: boolean; record?: VolcanoRecord }>('/import/check', {
      method: 'POST',
      body: JSON.stringify({ batchId }),
    }),

  getPerspectives: () =>
    request<{ success: boolean; data: Array<{ recordId: string; recordTitle: string; perspectives: Perspective[] }> }>(
      '/perspectives'
    ),

  getExportUrl: (format: 'json' | 'csv' = 'json', id?: string) => {
    const params = new URLSearchParams({ format });
    if (id) params.set('id', id);
    return `${API_BASE}/export?${params.toString()}`;
  },
};
