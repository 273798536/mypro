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
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  stores: {
    list: () => request('/stores'),
    get: (id: string) => request(`/stores/${id}`),
  },

  cards: {
    list: (params?: { status?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);
      const query = searchParams.toString();
      return request(`/cards${query ? `?${query}` : ''}`);
    },
    get: (id: string) => request(`/cards/${id}`),
    create: (data: { cardNo: string; userName: string; phone: string; operator: string }) =>
      request('/cards', { method: 'POST', body: JSON.stringify(data) }),
    ledger: (id: string) => request(`/cards/${id}/ledger`),
    consumptions: (id: string) => request(`/cards/${id}/consumptions`),
    updateStatus: (id: string, data: { status: string; operator: string }) =>
      request(`/cards/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  recharge: {
    list: (params?: { cardId?: string }) => {
      const query = params?.cardId ? `?cardId=${params.cardId}` : '';
      return request(`/recharge${query}`);
    },
    create: (data: { cardId: string; principalAmount: number; ruleId?: string; operator: string; source?: string; remark?: string }) =>
      request('/recharge', { method: 'POST', body: JSON.stringify(data) }),
  },

  consume: {
    list: (params?: { cardId?: string; storeId?: string; isReversed?: boolean }) => {
      const searchParams = new URLSearchParams();
      if (params?.cardId) searchParams.set('cardId', params.cardId);
      if (params?.storeId) searchParams.set('storeId', params.storeId);
      if (params?.isReversed !== undefined) searchParams.set('isReversed', String(params.isReversed));
      const query = searchParams.toString();
      return request(`/consume${query ? `?${query}` : ''}`);
    },
    create: (data: { cardId: string; storeId: string; amount: number; operator: string; remark?: string }) =>
      request('/consume', { method: 'POST', body: JSON.stringify(data) }),
    reverse: (id: string, data: { operator: string; reason: string }) =>
      request(`/consume/${id}/reverse`, { method: 'POST', body: JSON.stringify(data) }),
  },

  refund: {
    list: (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return request(`/refund${query}`);
    },
    create: (data: { cardId: string; applicant: string; reason?: string }) =>
      request('/refund', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string, data: { approver: string }) =>
      request(`/refund/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
    reject: (id: string, data: { approver: string; reason: string }) =>
      request(`/refund/${id}/reject`, { method: 'POST', body: JSON.stringify(data) }),
  },

  rules: {
    list: () => request('/rules'),
    active: () => request('/rules/active'),
    create: (data: { name: string; tiers: any[]; priority: string; effectiveFrom: string; effectiveTo?: string; createdBy: string }) =>
      request('/rules', { method: 'POST', body: JSON.stringify(data) }),
    activate: (id: string, data: { operator: string }) =>
      request(`/rules/${id}/activate`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  audit: {
    logs: (params?: { module?: string; action?: string; operator?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.module) searchParams.set('module', params.module);
      if (params?.action) searchParams.set('action', params.action);
      if (params?.operator) searchParams.set('operator', params.operator);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const query = searchParams.toString();
      return request(`/audit/logs${query ? `?${query}` : ''}`);
    },
    exceptions: () => request('/audit/exceptions'),
    snapshots: (params?: { date?: string }) => {
      const query = params?.date ? `?date=${params.date}` : '';
      return request(`/audit/snapshots${query}`);
    },
    export: (params?: { type?: string; startDate?: string; endDate?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set('type', params.type);
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);
      const query = searchParams.toString();
      return request(`/audit/export${query ? `?${query}` : ''}`);
    },
  },

  dashboard: {
    summary: () => request('/dashboard/summary'),
    trend: (params?: { days?: number }) => {
      const query = params?.days ? `?days=${params.days}` : '';
      return request(`/dashboard/trend${query}`);
    },
    storeStats: () => request('/dashboard/store-stats'),
    recentExceptions: () => request('/dashboard/recent-exceptions'),
  },
};
