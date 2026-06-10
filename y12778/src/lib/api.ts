import type {
  Calculation,
  Reagent,
  BatchInfo,
  TraceLink,
  OperationalError,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw data;
  }
  return data as T;
}

export interface CalculationStats {
  total: number;
  pending: number;
  passed: number;
  rejected: number;
  error: number;
}

export const api = {
  getCalculations: (status?: string) =>
    request<Calculation[]>(
      `/calculations${status ? `?status=${status}` : ''}`
    ),
  getCalculationStats: () =>
    request<CalculationStats>('/calculations/stats'),
  getCalculation: (id: string) =>
    request<Calculation & { traceIds: TraceLink[] }>(`/calculations/${id}`),
  getCalculationTrace: (id: string) =>
    request<TraceLink[]>(`/calculations/${id}/trace`),
  createCalculation: (data: {
    reagentId: string;
    observedTension: number;
    temperature: number;
  }) =>
    request<Calculation>('/calculations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reviewCalculation: (
    id: string,
    data: { status: 'passed' | 'rejected'; reviewNote?: string; operator?: string }
  ) =>
    request<Calculation>(`/calculations/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  exportCalculation: async (id: string) => {
    const res = await fetch(`${API_BASE}/calculations/${id}/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || `calculation_${id}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  getReagents: () => request<Reagent[]>('/reagents'),
  getReagent: (id: string) => request<Reagent>(`/reagents/${id}`),
  createReagent: (data: Partial<Reagent>) =>
    request<Reagent>('/reagents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  supplementReagent: (
    id: string,
    data: { fieldName: string; newValue: string; reason: string; operator?: string }
  ) =>
    request<Reagent>(`/reagents/${id}/supplement`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getBatches: () => request<BatchInfo[]>('/batches'),
  getBatch: (batchNo: string) => request<BatchInfo>(`/batches/${batchNo}`),
};

export type { OperationalError };
