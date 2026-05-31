import type {
  Song,
  MatchResult,
  Conflict,
  Review,
  AuditLog,
  PaginatedResponse,
  FilterParams,
  PaginationParams,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.message || error.error || '请求失败');
  }

  return response.json();
}

export const songsApi = {
  getAll: (params?: FilterParams & PaginationParams) =>
    request<PaginatedResponse<Song>>(`/songs?${new URLSearchParams(params as Record<string, string>).toString()}`),
  
  getById: (id: string) =>
    request<Song>(`/songs/${id}`),
  
  create: (data: { name: string; artist: string; duration?: number }) =>
    request<Song>('/songs', {
      method: 'POST',
      body: JSON.stringify({ ...data, source: 'playlist' }),
    }),
  
  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/songs/import`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },
  
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/songs/${id}`, {
      method: 'DELETE',
    }),
  
  getArtists: () =>
    request<string[]>('/songs/artists'),
};

export const matchesApi = {
  run: () =>
    request<{ total: number; created: number; updated: number }>('/matches/run', {
      method: 'POST',
    }),
  
  getAll: (params?: FilterParams & PaginationParams) =>
    request<PaginatedResponse<MatchResult & { song: Song; copyright: unknown }>>(
      `/matches?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  
  getById: (id: string) =>
    request<MatchResult & { song: Song; copyright: unknown }>(`/matches/${id}`),
  
  getStats: () =>
    request<{
      total: number;
      byRiskLevel: Record<string, number>;
      byMatchStatus: Record<string, number>;
    }>('/matches/stats'),
};

export const conflictsApi = {
  getAll: (params?: PaginationParams & { status?: string }) =>
    request<PaginatedResponse<Conflict & { matchResult: unknown }>>(
      `/matches/conflicts?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  
  getById: (id: string) =>
    request<Conflict & { matchResult: unknown }>(`/matches/conflicts/${id}`),
  
  resolve: (id: string, data: { status: string; resolution: string }) =>
    request<Conflict>(`/matches/conflicts/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const reviewsApi = {
  getAll: (params?: PaginationParams & { status?: string }) =>
    request<PaginatedResponse<Review & { matchResult: unknown }>>(
      `/matches/reviews?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  
  create: (data: {
    matchResultId: string;
    status: string;
    comments?: string;
    riskLevelOverride?: string;
  }) =>
    request<Review>('/matches/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: {
    status?: string;
    comments?: string;
    riskLevelOverride?: string;
  }) =>
    request<Review>(`/matches/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const exportApi = {
  downloadExcel: () =>
    fetch(`${API_BASE}/export/excel`).then(res => {
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'export.xlsx';
      return res.blob().then(blob => ({ blob, filename }));
    }),
  
  downloadPDF: () =>
    fetch(`${API_BASE}/export/pdf`).then(res => {
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'export.pdf';
      return res.blob().then(blob => ({ blob, filename }));
    }),
  
  getAuditLogs: (params?: PaginationParams & { entityType?: string; action?: string }) =>
    request<PaginatedResponse<AuditLog>>(
      `/export/audit-logs?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
};

export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
