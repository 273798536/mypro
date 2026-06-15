import type { Booth, Issue, PageSummary, AllStates, BoothNote, HistoryRecord } from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || '请求失败');
  }
  return data.data;
}

export const boothsApi = {
  getAll: () => request<Booth[]>('/booths'),
  getById: (id: number) => request<Booth & { notes: BoothNote[]; history: HistoryRecord[] }>(`/booths/${id}`),
  create: (data: Partial<Booth> & { operator?: string }) =>
    request<Booth>('/booths', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Booth> & { operator?: string; comment?: string }) =>
    request<Booth>(`/booths/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/booths/${id}`, { method: 'DELETE' }),
  addNote: (id: number, noteType: string, content: string, author = '小孟') =>
    request<BoothNote>(`/booths/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note_type: noteType, content, author }),
    }),
  getHistory: (id: number) => request<HistoryRecord[]>(`/booths/${id}/history`),
  scanIssues: () => request<Issue[]>('/booths/scan/issues'),
  getSummary: () => request<PageSummary>('/booths/scan/summary'),
};

export const stateApi = {
  getAll: () => request<AllStates>('/state'),
  get: (key: string) => request<{ key: string; value: any }>(`/state/${key}`),
  set: (key: string, value: any) =>
    request<{ key: string; value: any }>(`/state/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  refreshSummary: () => request<PageSummary>('/state/refresh-summary', { method: 'POST' }),
};
