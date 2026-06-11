import type {
  Batch,
  BatchDetail,
  Point,
  Collision,
  HistoryRecord,
  SavedView,
  RejudgePayload,
  AnomalyType,
  CollisionStatus,
} from '../../shared/types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json.data as T;
}

export const api = {
  listBatches: (status?: string, keyword?: string) => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (keyword) q.set('keyword', keyword);
    const qs = q.toString();
    return request<Batch[]>(`/api/batches${qs ? '?' + qs : ''}`);
  },

  getBatchDetail: (id: string) =>
    request<BatchDetail>(`/api/batches/${id}`),

  getBatchPoints: (id: string) =>
    request<Point[]>(`/api/batches/${id}/points`),

  getBatchCollisions: (id: string) =>
    request<Collision[]>(`/api/batches/${id}/collisions`),

  rejudgeCollision: (id: string, payload: RejudgePayload) =>
    request<{ collision: Collision; history: HistoryRecord }>(
      `/api/collisions/${id}/rejudge`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  listHistory: (batchId?: string) => {
    const qs = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
    return request<HistoryRecord[]>(`/api/history${qs}`);
  },

  listAnomalies: (opts?: {
    types?: AnomalyType[];
    status?: CollisionStatus[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    if (opts?.types?.length) q.set('types', opts.types.join(','));
    if (opts?.status?.length) q.set('status', opts.status.join(','));
    if (opts?.sortBy) q.set('sortBy', opts.sortBy);
    if (opts?.sortOrder) q.set('sortOrder', opts.sortOrder);
    const qs = q.toString();
    return request<Collision[]>(`/api/anomalies${qs ? '?' + qs : ''}`);
  },

  exportAnomaliesUrl: (opts?: {
    types?: AnomalyType[];
    status?: CollisionStatus[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    if (opts?.types?.length) q.set('types', opts.types.join(','));
    if (opts?.status?.length) q.set('status', opts.status.join(','));
    if (opts?.sortBy) q.set('sortBy', opts.sortBy);
    if (opts?.sortOrder) q.set('sortOrder', opts.sortOrder);
    const qs = q.toString();
    return `/api/anomalies/export${qs ? '?' + qs : ''}`;
  },

  listViews: () => request<SavedView[]>('/api/views'),

  getView: (id: string) => request<SavedView>(`/api/views/${id}`),

  createView: (view: Omit<SavedView, 'id' | 'createdAt'>) =>
    request<SavedView>('/api/views', {
      method: 'POST',
      body: JSON.stringify(view),
    }),
};
