const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  batches: {
    list: (params?: Record<string, string>) =>
      request(`/batches?${new URLSearchParams(params)}`),
    stats: () => request<{ total: number; pendingReview: number; frozen: number; settled: number }>('/batches/stats'),
    get: (id: string) => request(`/batches/${id}`),
    create: (data: any) => request('/batches', { method: 'POST', body: JSON.stringify(data) }),
    freeze: (id: string, data: any) => request(`/batches/${id}/freeze`, { method: 'POST', body: JSON.stringify(data) }),
    unfreeze: (id: string, data: any) => request(`/batches/${id}/unfreeze`, { method: 'POST', body: JSON.stringify(data) }),
    settle: (id: string, data: any) => request(`/batches/${id}/settle`, { method: 'POST', body: JSON.stringify(data) }),
    submit: (id: string, data: any) => request(`/batches/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
    getAttachments: (id: string) => request(`/batches/${id}/attachments`),
    uploadAttachment: (id: string, data: any) => 
      request(`/batches/${id}/attachments`, { method: 'POST', body: JSON.stringify(data) }),
    deleteAttachment: (id: string, attachmentId: string, operatedBy: string) =>
      request(`/batches/${id}/attachments/${attachmentId}`, { method: 'DELETE', body: JSON.stringify({ operatedBy }) }),
  },
  documents: {
    list: (params?: Record<string, string>) =>
      request(`/documents?${new URLSearchParams(params)}`),
    pendingReview: (params?: Record<string, string>) =>
      request(`/documents/pending-review?${new URLSearchParams(params)}`),
    get: (id: string) => request(`/documents/${id}`),
    getDiff: (id: string, fromVersion: number, toVersion: number) =>
      request(`/documents/${id}/diff?fromVersion=${fromVersion}&toVersion=${toVersion}`),
    create: (data: any) => request('/documents', { method: 'POST', body: JSON.stringify(data) }),
    getAttachments: (id: string) => request(`/documents/${id}/attachments`),
    uploadAttachment: (id: string, data: any) =>
      request(`/documents/${id}/attachments`, { method: 'POST', body: JSON.stringify(data) }),
    deleteAttachment: (id: string, attachmentId: string, operatedBy: string) =>
      request(`/documents/${id}/attachments/${attachmentId}`, { method: 'DELETE', body: JSON.stringify({ operatedBy }) }),
  },
  review: {
    pending: () => request('/review/pending'),
    decide: (id: string, data: any) =>
      request(`/review/${id}/decision`, { method: 'POST', body: JSON.stringify(data) }),
  },
  tasks: {
    list: (params?: Record<string, string>) =>
      request(`/tasks?${new URLSearchParams(params)}`),
    stats: () => request<{ total: number; pending: number; waitingRetry: number; waitingManual: number; failed: number; success: number }>('/tasks/stats'),
    get: (id: string) => request(`/tasks/${id}`),
    retry: (id: string, data: any) => request(`/tasks/${id}/retry`, { method: 'POST', body: JSON.stringify(data) }),
    manual: (id: string, data: any) => request(`/tasks/${id}/manual`, { method: 'POST', body: JSON.stringify(data) }),
    create: (data: any) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  },
  reports: {
    list: (params?: Record<string, string>) =>
      request(`/reports?${new URLSearchParams(params)}`),
    get: (id: string) => request(`/reports/${id}`),
    generate: (data: any) => request('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),
    export: (id: string) => fetch(`${API_BASE}/reports/${id}/export`).then(res => res.blob()),
  },
  audit: {
    list: (params?: Record<string, string>) =>
      request(`/audit?${new URLSearchParams(params)}`),
    getByEntity: (entityType: string, entityId: string) =>
      request(`/audit/${entityType}/${entityId}`),
  },
};

export default api;
