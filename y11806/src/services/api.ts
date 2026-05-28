import type {
  SettlementPeriod,
  ShopOrder,
  CashFlowForecast,
  PendingItem,
  AdFeeRecord,
  ApiResponse,
  FeeBreakdown,
} from '@/types';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || '请求失败');
  }
  return data.data;
}

export const api = {
  async getPeriods(): Promise<SettlementPeriod[]> {
    return fetchApi<SettlementPeriod[]>('/periods');
  },

  async getOrders(periodId?: string): Promise<ShopOrder[]> {
    const url = periodId ? `/orders?periodId=${periodId}` : '/orders';
    return fetchApi<ShopOrder[]>(url);
  },

  async getCashFlow(): Promise<CashFlowForecast[]> {
    return fetchApi<CashFlowForecast[]>('/cashflow');
  },

  async getPendingItems(): Promise<PendingItem[]> {
    return fetchApi<PendingItem[]>('/pending');
  },

  async getFeeBreakdown(periodId: string): Promise<FeeBreakdown> {
    return fetchApi<FeeBreakdown>(`/fees/breakdown/${periodId}`);
  },

  async addAdFee(record: Omit<AdFeeRecord>): Promise<AdFeeRecord> {
    return fetchApi<AdFeeRecord>('/fees', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  async confirmPendingItem(id: string): Promise<void> {
    return fetchApi<void>(`/pending/${id}/confirm`, {
      method: 'POST',
    });
  },

  async exportData(params: {
    periodId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Blob> {
    const query = new URLSearchParams(params as Record<string, string>);
    const response = await fetch(`${API_BASE}/export?${query}`);
    return response.blob();
  },

  async filterOrders(filters: {
    periodId?: string;
    shopName?: string;
    status?: string;
  }): Promise<ShopOrder[]> {
    const query = new URLSearchParams(filters as Record<string, string>);
    return fetchApi<ShopOrder[]>(`/orders/filter?${query}`);
  },
};
