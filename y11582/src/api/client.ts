
import type { QueueTask, TaskStatus, SourceType, CreateTaskRequest, ImportResult, DashboardStats, RetryCategory, OperationHistory, OriginalEvidence, LoginRequest, LoginResponse, UserRole } from '../../shared/types';

const API_BASE = '/api';
const TOKEN_KEY = 'auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.href = '/login';
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  auth: {
    login(username: string, password: string): Promise<LoginResponse> {
      return request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password } as LoginRequest),
      });
    },
    logout(): Promise<{ success: boolean; message: string }> {
      return request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' });
    },
    me(): Promise<{ id: string; username: string; role: UserRole }> {
      return request<{ id: string; username: string; role: UserRole }>('/auth/me');
    },
  },
  tasks: {
    create(data: CreateTaskRequest): Promise<QueueTask> {
      return request<QueueTask>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    list(filters?: { status?: TaskStatus; sourceType?: SourceType }): Promise<QueueTask[]> {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.sourceType) params.append('sourceType', filters.sourceType);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<QueueTask[]>(`/tasks${query}`);
    },

    get(id: string): Promise<QueueTask> {
      return request<QueueTask>(`/tasks/${id}`);
    },

    getHistory(id: string): Promise<OperationHistory[]> {
      return request<OperationHistory[]>(`/tasks/${id}/history`);
    },

    getEvidence(id: string): Promise<OriginalEvidence[]> {
      return request<OriginalEvidence[]>(`/tasks/${id}/evidence`);
    },

    retry(id: string): Promise<QueueTask> {
      return request<QueueTask>(`/tasks/${id}/retry`, { method: 'PUT' });
    },

    manualOverride(id: string, standardData: Record<string, unknown>, remark?: string): Promise<QueueTask> {
      return request<QueueTask>(`/tasks/${id}/manual`, {
        method: 'PUT',
        body: JSON.stringify({ standardData, remark }),
      });
    },

    compensate(id: string, remark?: string): Promise<QueueTask> {
      return request<QueueTask>(`/tasks/${id}/compensate`, {
        method: 'PUT',
        body: JSON.stringify({ remark }),
      });
    },

    close(id: string, remark?: string): Promise<QueueTask> {
      return request<QueueTask>(`/tasks/${id}/close`, {
        method: 'PUT',
        body: JSON.stringify({ remark }),
      });
    },

    markPermanentFailed(id: string, remark?: string): Promise<QueueTask> {
      return request<QueueTask>(`/tasks/${id}/permanent-failed`, {
        method: 'PUT',
        body: JSON.stringify({ remark }),
      });
    },
  },

  dashboard: {
    getStats(): Promise<DashboardStats> {
      return request<DashboardStats>('/dashboard/stats');
    },

    getRetryCategories(): Promise<RetryCategory[]> {
      return request<RetryCategory[]>('/dashboard/retry-categories');
    },
  },

  deadLetter: {
    list(): Promise<QueueTask[]> {
      return request<QueueTask[]>('/dead-letter');
    },

    revive(id: string): Promise<QueueTask> {
      return request<QueueTask>(`/dead-letter/${id}/revive`, { method: 'POST' });
    },
  },

  import: {
    csv(file: File, sourceType: SourceType): Promise<ImportResult> {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', sourceType);

      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(`${API_BASE}/import/csv`, {
        method: 'POST',
        headers,
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Import failed');
        return res.json();
      });
    },

    json(sourceType: SourceType, rows: Array<Record<string, unknown>>, fileName?: string): Promise<ImportResult> {
      return request<ImportResult>('/import/json', {
        method: 'POST',
        body: JSON.stringify({ sourceType, rows, fileName }),
      });
    },
  },

  admin: {
    resume(): Promise<{ resumed: number; message: string }> {
      return request<{ resumed: number; message: string }>('/admin/resume', { method: 'POST' });
    },

    start(): Promise<{ message: string }> {
      return request<{ message: string }>('/admin/start', { method: 'POST' });
    },

    stop(): Promise<{ message: string }> {
      return request<{ message: string }>('/admin/stop', { method: 'POST' });
    },
  },
};
