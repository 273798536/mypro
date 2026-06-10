const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `请求失败: ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  reagents: {
    list: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reagents${query}`);
    },
    categories: () => request<string[]>('/reagents/categories'),
    get: (id: string) => request<any>(`/reagents/${id}`),
    create: (data: any) => request<any>('/reagents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/reagents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request<any>(`/reagents/${id}`, { method: 'DELETE' }),
    import: (items: any[]) =>
      request<any>('/reagents/import', { method: 'POST', body: JSON.stringify({ items }) }),
    exportUrl: () => `${API_BASE}/reagents/export/download`,
    transactions: (id: string) => request<any[]>(`/reagents/${id}/transactions`),
    addTransaction: (id: string, data: any) =>
      request<any>(`/reagents/${id}/transaction`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  batches: {
    list: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/batches${query}`);
    },
    stats: () => request<any>('/batches/stats'),
    get: (id: string) => request<any>(`/batches/${id}`),
    create: (data: any) => request<any>('/batches', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request<any>(`/batches/${id}`, { method: 'DELETE' }),
    import: (items: any[]) =>
      request<any>('/batches/import', { method: 'POST', body: JSON.stringify({ items }) }),
    thicknessList: (id: string) => request<any[]>(`/batches/${id}/thickness`),
    calculate: (id: string, data: any) =>
      request<any>(`/batches/${id}/thickness/calculate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addThickness: (id: string, data: any) =>
      request<any>(`/batches/${id}/thickness`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  spectrums: {
    list: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/spectrums${query}`);
    },
    get: (id: string) => request<any>(`/spectrums/${id}`),
    create: (data: any) =>
      request<any>('/spectrums', { method: 'POST', body: JSON.stringify(data) }),
    interpret: (id: string, data: any) =>
      request<any>(`/spectrums/${id}/interpret`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  sampleData: {
    status: () => request<any>('/sample-data/status'),
    init: () => request<any>('/sample-data/init', { method: 'POST' }),
    check: () => request<any>('/sample-data/check'),
  },
};
