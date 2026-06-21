import type {
  TopoRecord,
  RecordVersion,
  ComputationStep,
  HandoverSummary,
  ImportRecordInput,
  UpdateRecordInput,
  RecordStatus,
} from '@shared/types';

export function genIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  return `key-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function request<T>(path: string, init?: RequestInit & { idempotent?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  if (init?.idempotent) {
    let k = localStorage.getItem(`idempotency:${path}`);
    if (!k) {
      k = genIdempotencyKey();
      localStorage.setItem(`idempotency:${path}`, k);
    }
    headers.set('Idempotency-Key', k);
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status}: ${txt || res.statusText}`);
  }
  if (res.headers.get('Content-Type')?.includes('text/csv')) {
    return (await res.text()) as unknown as T;
  }
  return res.json();
}

export const api = {
  listRecords(filters?: { status?: RecordStatus; keyword?: string }) {
    const qs = new URLSearchParams();
    if (filters?.status) qs.set('status', filters.status);
    if (filters?.keyword) qs.set('keyword', filters.keyword);
    return request<{ items: TopoRecord[]; total: number }>(`/api/records?${qs.toString()}`);
  },

  getRecord(id: string) {
    return request<TopoRecord>(`/api/records/${id}`);
  },

  getVersions(id: string) {
    return request<{ items: RecordVersion[] }>(`/api/records/${id}/versions`);
  },

  getComputation(id: string) {
    return request<{ steps: ComputationStep[] }>(`/api/records/${id}/computation`);
  },

  importRecords(items: ImportRecordInput[], operator = '阿乔') {
    return request<{ items: TopoRecord[]; count: number }>('/api/records/import', {
      method: 'POST',
      body: JSON.stringify({ items, operator }),
      idempotent: true,
    });
  },

  confirm(id: string, operator = '阿乔') {
    return request<TopoRecord>(`/api/records/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ operator }),
      idempotent: true,
    });
  },

  revoke(id: string, operator = '阿乔') {
    return request<TopoRecord>(`/api/records/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ operator }),
      idempotent: true,
    });
  },

  updateRecord(id: string, input: UpdateRecordInput) {
    return request<TopoRecord>(`/api/records/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(input),
      idempotent: true,
    });
  },

  summary() {
    return request<HandoverSummary>('/api/summary');
  },

  async exportCsv(filters?: { status?: RecordStatus; keyword?: string }) {
    const qs = new URLSearchParams();
    if (filters?.status) qs.set('status', filters.status);
    if (filters?.keyword) qs.set('keyword', filters.keyword);
    const res = await fetch(`/api/export?${qs.toString()}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topo-review-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
