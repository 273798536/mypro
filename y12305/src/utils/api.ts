import type {
  TariffTable,
  UsageRecord,
  CalculationVersion,
  CalculateRequest,
  TraceNode,
  VersionComparison,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `请求失败: ${response.status}`);
  }

  return response.json();
}

export const api = {
  tariffs: {
    getAll: () => request<TariffTable[]>('/tariffs'),
    getActive: (date?: string) =>
      request<TariffTable[]>(`/tariffs/active${date ? `?date=${date}` : ''}`),
    getExpired: () => request<TariffTable[]>('/tariffs/expired'),
    getById: (id: string) => request<TariffTable>(`/tariffs/${id}`),
    create: (data: Omit<TariffTable, 'id' | 'createdAt' | 'isExpired'>) =>
      request<TariffTable>('/tariffs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<TariffTable>) =>
      request<TariffTable>(`/tariffs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/tariffs/${id}`, { method: 'DELETE' }),
  },

  usageRecords: {
    getAll: () => request<UsageRecord[]>('/usage-records'),
    getById: (id: string) => request<UsageRecord>(`/usage-records/${id}`),
    getByDateRange: (start: string, end: string) =>
      request<UsageRecord[]>(`/usage-records/date-range?start=${start}&end=${end}`),
    create: (data: Omit<UsageRecord, 'id' | 'importedAt'>) =>
      request<{ record: UsageRecord; warnings: string[] }>('/usage-records', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<UsageRecord>) =>
      request<{ record: UsageRecord; warnings: string[] }>(`/usage-records/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/usage-records/${id}`, { method: 'DELETE' }),
    validate: (id: string) =>
      request<{ valid: boolean; hasNegativeUsage: boolean; issues: string[] }>(
        `/usage-records/${id}/validate`
      ),
  },

  calculate: {
    execute: (data: CalculateRequest) =>
      request<{
        success: boolean;
        version: CalculationVersion;
        summary: {
          totalBill: number;
          calculatedTotal: number;
          discrepancy: number;
          totalCalculatedKwh: number;
          warningCount: number;
          errorCount: number;
        };
      }>('/calculate', { method: 'POST', body: JSON.stringify(data) }),

    preview: (tariffTableId: string, usageRecordId: string) =>
      request<{
        preview: boolean;
        tariff: { id: string; name: string };
        usageRecord: { id: string; recordDate: string };
        result: {
          tierResults: unknown[];
          calculatedTotal: number;
          discrepancy: number;
          totalCalculatedKwh: number;
          warnings: unknown[];
        };
      }>('/calculate/preview', {
        method: 'POST',
        body: JSON.stringify({ tariffTableId, usageRecordId }),
      }),
  },

  versions: {
    getAll: () => request<CalculationVersion[]>('/versions'),
    getById: (id: string) => request<CalculationVersion>(`/versions/${id}`),
    getByTariff: (tariffId: string) =>
      request<CalculationVersion[]>(`/versions/tariff/${tariffId}`),
    getByUsage: (usageId: string) =>
      request<CalculationVersion[]>(`/versions/usage/${usageId}`),
    compare: (idA: string, idB: string) =>
      request<VersionComparison>(`/versions/compare?ids=${idA},${idB}`),
    delete: (id: string) =>
      request<{ success: boolean }>(`/versions/${id}`, { method: 'DELETE' }),
  },

  trace: {
    getTree: (versionId: string) =>
      request<{ traceTree: TraceNode }>(`/trace/${versionId}`),
    getSources: (versionId: string) =>
      request<{
        version: CalculationVersion;
        tariff: TariffTable;
        usageRecord: UsageRecord;
      }>(`/trace/${versionId}/sources`),
    getWarnings: (versionId: string) =>
      request<{
        warnings: unknown[];
        tariffTableId: string;
        usageRecordId: string;
      }>(`/trace/${versionId}/warnings`),
    getWarningSource: (versionId: string, traceId: string) =>
      request(`/trace/${versionId}/warnings/${traceId}/source`),
    findNode: (versionId: string, nodeId: string) =>
      request<{ node: TraceNode; path: TraceNode[] }>(`/trace/${versionId}/find-node`, {
        method: 'POST',
        body: JSON.stringify({ nodeId }),
      }),
  },
};
