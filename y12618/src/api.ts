export interface Level {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'review' | 'confirmed';
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  snapEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Violation {
  id: string;
  levelId: string;
  ruleConfigId: string;
  violationType: string;
  description: string;
  affectedConclusionIds: string[];
  status: 'open' | 'fixed' | 'suppressed';
  createdAt: string;
}

export interface Conclusion {
  id: string;
  levelId: string;
  content: string;
  sourceDraftIds: string[];
  status: 'pending' | 'confirmed' | 'rejected';
  dedupHash: string;
  createdAt: string;
}

export interface Draft {
  id: string;
  levelId: string;
  name: string;
  content: string;
  status: 'missing' | 'partial' | 'complete';
  linkedConclusionIds: string[];
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  entityType: 'level' | 'violation' | 'conclusion' | 'draft';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'merge';
  beforeData: unknown;
  afterData: unknown;
  description: string;
  createdAt: string;
}

export interface DedupGroup {
  canonicalId: string;
  duplicateIds: string[];
  content: string;
}

export interface DedupResult {
  hasDuplicates: boolean;
  groups: DedupGroup[];
}

export interface ConsistencyDifference {
  field: string;
  uiValue: string;
  exportValue: string;
  conclusionId: string;
}

export interface ConsistencyReport {
  isConsistent: boolean;
  differences: ConsistencyDifference[];
}

export interface ViolationFixError {
  code: string;
  message: string;
  actionableHint: string;
  missingDraftNames: string[];
}

interface ViolationsResponse {
  violations: Violation[];
  affectedConclusions: Conclusion[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const error = new Error(err.message || `Request failed: ${res.status}`);
    (error as Error & { data?: unknown }).data = err;
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  seed: () => request<{ success: boolean }>('/api/seed', { method: 'POST' }),

  getLevels: () => request<Level[]>('/api/levels'),
  getLevel: (id: string) => request<Level>(`/api/levels/${id}`),
  createLevel: (data: {
    name: string;
    description?: string;
    status?: Level['status'];
    gridWidth?: number;
    gridHeight?: number;
    cellSize?: number;
    snapEnabled?: boolean;
  }) => request<Level>('/api/levels', { method: 'POST', body: JSON.stringify(data) }),
  updateLevel: (id: string, data: {
    name?: string;
    description?: string;
    status?: Level['status'];
    gridWidth?: number;
    gridHeight?: number;
    cellSize?: number;
    snapEnabled?: boolean;
  }) => request<Level>(`/api/levels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getViolations: (levelId: string) =>
    request<ViolationsResponse>(`/api/levels/${levelId}/violations`),
  updateViolation: (id: string, data: { status?: Violation['status']; description?: string }) =>
    request<Violation>(`/api/violations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  checkDedup: (levelId: string) =>
    request<DedupResult>('/api/violations/check-dedup', {
      method: 'POST',
      body: JSON.stringify({ levelId }),
    }),
  mergeDuplicates: (canonicalId: string, duplicateIds: string[]) =>
    request<Conclusion>('/api/violations/merge', {
      method: 'POST',
      body: JSON.stringify({ canonicalId, duplicateIds }),
    }),

  getConclusions: (levelId: string) =>
    request<Conclusion[]>(`/api/levels/${levelId}/conclusions`),

  getDrafts: (levelId: string) =>
    request<Draft[]>(`/api/levels/${levelId}/drafts`),
  createDraft: (levelId: string, data: {
    name: string;
    content?: string;
    status?: Draft['status'];
    linkedConclusionIds?: string[];
  }) => request<Draft>(`/api/levels/${levelId}/drafts`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getHistory: (params?: { entityType?: string; entityId?: string }) => {
    const query = new URLSearchParams();
    if (params?.entityType) query.set('entityType', params.entityType);
    if (params?.entityId) query.set('entityId', params.entityId);
    const qs = query.toString();
    return request<HistoryEntry[]>(`/api/history${qs ? `?${qs}` : ''}`);
  },

  exportData: (data: { levelIds: string[]; format: 'json' | 'csv'; includeHistory?: boolean }) =>
    request<unknown>('/api/export', { method: 'POST', body: JSON.stringify(data) }),

  checkConsistency: (levelIds: string[]) =>
    request<ConsistencyReport>('/api/export/consistency', {
      method: 'POST',
      body: JSON.stringify({ levelIds }),
    }),
};
