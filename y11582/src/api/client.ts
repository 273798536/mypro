
import type { QueueTask, TaskStatus, SourceType, CreateTaskRequest, ImportResult, DashboardStats, RetryCategory, OperationHistory, OriginalEvidence } from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-operator': 'web_user',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
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

    getEvidence(id: string): Promise<OriginalEvidence> {
      return request<OriginalEvidence>(`/tasks/${id}/evidence`);
    },

    retry(id: string): Promise<QueueTask> {
      return request<QueueTask>(`/tasks/${id}/retry`, { method: 'PUT' });
    },

    manualOverride(id: string, standardData: Record<string, any>, remark?: string): Promise<QueueTask> {
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

      return fetch(`${API_BASE}/import/csv`, {
        method: 'POST',
        headers: {
          'x-operator': 'web_user',
        },
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Import failed');
        return res.json();
      });
    },

    json(sourceType: SourceType, rows: Record<string, any>[], fileName?: string): Promise<ImportResult> {
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
