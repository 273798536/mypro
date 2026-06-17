import type { DeliveryRecord, FilterCriteria, ExportOptions } from '@shared/types';

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
    throw new Error(error.error || '请求失败');
  }

  if (response.headers.get('Content-Type')?.includes('application/json')) {
    return response.json();
  }
  return response.blob() as unknown as T;
}

export const api = {
  records: {
    list: (filters?: FilterCriteria) => {
      const params = new URLSearchParams(filters as any).toString();
      return request<DeliveryRecord[]>(`/records${params ? `?${params}` : ''}`);
    },
    get: (id: string) => request<DeliveryRecord>(`/records/${id}`),
    create: (data: any) => request<{ id: string }>('/records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, updates: Partial<DeliveryRecord>, note?: string) => request<{ success: boolean }>(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ updates, note }),
    }),
    delete: (id: string) => request<{ success: boolean }>(`/records/${id}`, {
      method: 'DELETE',
    }),
  },

  issues: {
    resolve: (issueId: string) => request<{ success: boolean }>(`/issues/${issueId}/resolve`, {
      method: 'POST',
    }),
  },

  validate: {
    coordinates: (id: string) => request<{ valid: boolean; offset: number; suggestion: string }>(`/validate/coordinates/${id}`),
  },

  merge: {
    findSimilar: () => request<Array<{ records: DeliveryRecord[]; similarity: number; suggestion: string }>>('/similar-locations'),
    merge: (targetId: string, sourceIds: string[], reason: string) => request<{ success: boolean }>('/merge/locations', {
      method: 'POST',
      body: JSON.stringify({ targetId, sourceIds, reason }),
    }),
  },

  history: {
    get: (recordId: string) => request(`/history/${recordId}`),
  },

  import: {
    excel: (file: File, onProgress?: (loaded: number, total: number) => void) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${API_BASE}/import/excel`, {
        method: 'POST',
        body: formData,
      }).then((res) => {
        if (!res.ok) throw new Error('导入失败');
        return res.json();
      });
    },
    preview: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${API_BASE}/import/preview`, {
        method: 'POST',
        body: formData,
      }).then((res) => {
        if (!res.ok) throw new Error('预览失败');
        return res.json();
      });
    },
    manual: (data: any) => request<{ id: string }>('/import/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  export: {
    preview: (filters: FilterCriteria) => request<{ records: DeliveryRecord[]; count: number; filterNote: string }>('/export/preview', {
      method: 'POST',
      body: JSON.stringify({ filters }),
    }),
    excel: (filters: FilterCriteria, options: ExportOptions) => request<Blob>('/export/excel', {
      method: 'POST',
      body: JSON.stringify({ filters, options }),
    }),
  },
};
