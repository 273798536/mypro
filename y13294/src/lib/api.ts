import type {
  ChangeResult,
  ListRunResult,
  RampDetail,
  RampListItem,
  RampStatus,
  RampsQuery,
  Source,
} from '@shared/types';

const BASE = '/api';

interface ApiEnvelope<T> {
  ok: boolean;
  message?: string;
  data?: T;
  error?: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const text = await res.text();
  let parsed: ApiEnvelope<T> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      parsed = null;
    }
  }
  if (!res.ok) {
    const msg = parsed?.message || parsed?.error || `请求失败 (${res.status})`;
    throw new Error(msg);
  }
  return (parsed?.data ?? (parsed as unknown as T)) as T;
}

function qs(q?: Partial<RampsQuery>): string {
  if (!q) return '';
  const p = new URLSearchParams();
  if (q.source) p.set('source', q.source);
  if (q.status) p.set('status', q.status);
  if (q.overriding !== undefined) p.set('overriding', String(q.overriding));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export interface ChangeBody {
  source: Source;
  newStatus: RampStatus;
  note: string;
  affectedSummary: string;
  operator: string;
  itemId?: string | null;
}

export interface PhotoBody {
  title: string;
  content: string;
  photoUrl: string;
  note: string;
  affectedSummary: string;
  operator: string;
  newStatus?: RampStatus;
}

export interface FeedbackBody {
  content: string;
  isGrayscale: boolean;
  affectsRamps: string[];
  note?: string;
  affectedSummary?: string;
  operator: string;
  newStatus?: RampStatus;
}

export const api = {
  listRamps: (q?: RampsQuery) => req<RampListItem[]>(`/ramps${qs(q)}`),
  getRamp: (id: string) => req<RampDetail>(`/ramps/${id}`),
  addChange: (id: string, body: ChangeBody) =>
    req<ChangeResult>(`/ramps/${id}/changes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  addPhoto: (id: string, body: PhotoBody) =>
    req<ChangeResult & { itemId: string }>(`/ramps/${id}/photos`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  addFeedback: (id: string, body: FeedbackBody) =>
    req<ChangeResult>(`/ramps/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  generate: () => req<ListRunResult>('/list/generate', { method: 'POST' }),
  rerun: () => req<ListRunResult>('/list/rerun', { method: 'POST' }),
  exportCsvUrl: (status?: RampStatus) => `${BASE}/export/csv${qs({ status })}`,
};
