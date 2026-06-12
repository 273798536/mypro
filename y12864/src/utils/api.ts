import type {
  SamplingRecord,
  SamplingRecordInput,
  RiskAssessmentResult,
  AnomalyGroup,
  ImpactChainResult,
  ExportReport
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `请求失败: ${response.status}`);
  }
  return data as T;
}

export const api = {
  records: {
    getAll: (riskLevel?: string) =>
      request<{ data: SamplingRecord[] }>(
        riskLevel ? `/records?risk_level=${riskLevel}` : '/records'
      ),
    getOne: (id: number) =>
      request<{ data: SamplingRecord }>(`/records/${id}`),
    create: (input: SamplingRecordInput) =>
      request<{ data: SamplingRecord; assessment: RiskAssessmentResult }>(
        '/records',
        { method: 'POST', body: JSON.stringify(input) }
      ),
    update: (id: number, updates: Partial<SamplingRecordInput> & { confirmed?: boolean }) =>
      request<{ data: SamplingRecord; assessment: RiskAssessmentResult; message: string }>(
        `/records/${id}`,
        { method: 'PUT', body: JSON.stringify(updates) }
      ),
    remove: (id: number) =>
      request<{ message: string }>(`/records/${id}`, { method: 'DELETE' }),
    batchImport: (records: SamplingRecordInput[]) =>
      request<{ imported: number; failed: number; results: unknown[] }>(
        '/records/import',
        { method: 'POST', body: JSON.stringify(records) }
      ),
    assess: (id: number) =>
      request<{ data: RiskAssessmentResult }>(`/records/${id}/assess`, { method: 'POST' }),
    getAssessments: (id: number) =>
      request<{ data: RiskAssessmentResult[] }>(`/records/${id}/assessments`),
    getLog: (id: number) =>
      request<{ data: unknown[] }>(`/records/${id}/log`)
  },
  anomalies: {
    getAll: () =>
      request<{ data: AnomalyGroup }>('/anomalies'),
    getImpactChain: (id: number) =>
      request<{ data: ImpactChainResult }>(`/anomalies/impact/${id}`)
  },
  export: {
    preview: () =>
      request<{ data: ExportReport }>('/export/preview'),
    downloadJSON: () => {
      window.open(`${API_BASE}/export?format=json`, '_blank');
    },
    downloadCSV: () => {
      window.open(`${API_BASE}/export?format=csv`, '_blank');
    }
  },
  health: () =>
    request<{ success: boolean; message: string }>('/health')
};
